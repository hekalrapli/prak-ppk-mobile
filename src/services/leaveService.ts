// src/services/leaveService.ts
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { LeaveClassification, LeaveRequest, LeaveStatus } from '../types/attendance';
import { classifyLeaveReason } from './leaveClassifier';
import { getHumanReadableErrorMessage, validateLeaveReason } from './errorHandler';

/**
 * Hasil klasifikasi AI disimpan di dokumen terpisah
 * (leaveClassifications/{uid}) agar hanya asisten yang dapat membacanya.
 * Setiap praktikan tetap dapat menulis hasil klasifikasi miliknya sendiri
 * (write-only) tanpa bisa membacanya kembali.
 */
function classificationDocRef(practicumId: string, sessionId: string, praktikanId: string) {
  return doc(
    db,
    'practicums',
    practicumId,
    'sessions',
    sessionId,
    'leaveClassifications',
    praktikanId
  );
}

/**
 * FR-17 & FR-18: Mengajukan izin oleh praktikan.
 * Memvalidasi alasan, memanggil model AI, dan menyimpan dokumen ke
 * practicums/{pid}/sessions/{sid}/leaveRequests/{uid}. Hasil klasifikasi
 * disimpan terpisah di leaveClassifications/{uid} (hanya untuk asisten).
 */
export async function submitLeaveRequest(params: {
  practicumId: string;
  sessionId: string;
  praktikanId: string;
  praktikanName: string;
  praktikanNim: string;
  reason: string;
}): Promise<LeaveRequest> {
  const { practicumId, sessionId, praktikanId, praktikanName, praktikanNim, reason } = params;

  // 1. Validasi input
  const validationError = validateLeaveReason(reason);
  if (validationError) {
    throw new Error(validationError);
  }

  try {
    const leaveDocRef = doc(db, 'practicums', practicumId, 'sessions', sessionId, 'leaveRequests', praktikanId);
    const existingSnap = await getDoc(leaveDocRef);

    if (existingSnap.exists()) {
      // Sudah pernah mengajukan: kembalikan dokumen yang ada agar UI langsung
      // menampilkan status izin (idempoten), bukan melempar error yang
      // membingungkan bila listener sempat gagal dimuat.
      const existing = existingSnap.data();

      return {
        id: existingSnap.id,
        praktikanId: existing.praktikanId ?? praktikanId,
        praktikanName: existing.praktikanName ?? praktikanName,
        praktikanNim: existing.praktikanNim ?? praktikanNim,
        reason: existing.reason ?? reason.trim(),
        status: (existing.status as LeaveStatus) ?? 'pending',
        createdAt: existing.createdAt,
        decidedBy: existing.decidedBy,
        decidedAt: existing.decidedAt,
        reviewNote: existing.reviewNote,
        sessionId,
        practicumId,
      };
    }

    // 2. Panggil klasifikasi AI (FR-18)
    // AI gagal tidak membatalkan pengajuan, tetap disimpan dengan state failed
    const aiResult = await classifyLeaveReason(reason);

    // 3. Simpan dokumen izin (tanpa hasil AI; praktikan tidak boleh melihatnya)
    const newRequest: LeaveRequest = {
      praktikanId,
      praktikanName,
      praktikanNim,
      reason: reason.trim(),
      status: 'pending',
      createdAt: serverTimestamp(),
      sessionId,
      practicumId,
    };

    await setDoc(leaveDocRef, {
      praktikanId,
      praktikanName,
      praktikanNim,
      reason: reason.trim(),
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    // 4. Simpan hasil klasifikasi untuk asisten (best-effort, FR-18)
    try {
      await setDoc(classificationDocRef(practicumId, sessionId, praktikanId), {
        ai: aiResult,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Gagal menyimpan hasil AI tidak boleh menggagalkan pengajuan izin.
    }

    return newRequest;
  } catch (error: any) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-17: Memperbarui alasan izin yang masih berstatus pending
 */
export async function updateLeaveReason(
  practicumId: string,
  sessionId: string,
  praktikanId: string,
  newReason: string
): Promise<void> {
  const validationError = validateLeaveReason(newReason);
  if (validationError) {
    throw new Error(validationError);
  }

  try {
    const leaveDocRef = doc(db, 'practicums', practicumId, 'sessions', sessionId, 'leaveRequests', praktikanId);
    const snap = await getDoc(leaveDocRef);

    if (!snap.exists()) {
      throw new Error('Pengajuan izin tidak ditemukan.');
    }
    if (snap.data()?.status !== 'pending') {
      throw new Error('Izin tidak dapat diubah karena sudah diproses oleh asisten.');
    }

    const aiResult = await classifyLeaveReason(newReason);

    await updateDoc(leaveDocRef, {
      reason: newReason.trim(),
    });

    // Tulis ulang hasil klasifikasi terbaru untuk asisten (best-effort).
    try {
      await setDoc(
        classificationDocRef(practicumId, sessionId, praktikanId),
        { ai: aiResult, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch {
      // Hasil AI gagal disimpan tidak membatalkan perubahan alasan.
    }
  } catch (error: any) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-17: Membatalkan pengajuan izin yang masih pending
 */
export async function cancelLeaveRequest(
  practicumId: string,
  sessionId: string,
  praktikanId: string
): Promise<void> {
  try {
    const leaveDocRef = doc(db, 'practicums', practicumId, 'sessions', sessionId, 'leaveRequests', praktikanId);
    const snap = await getDoc(leaveDocRef);

    if (!snap.exists()) {
      return;
    }
    if (snap.data()?.status !== 'pending') {
      throw new Error('Izin tidak dapat dibatalkan karena sudah diproses oleh asisten.');
    }

    await deleteDoc(leaveDocRef);
  } catch (error: any) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-18: Mencoba ulang klasifikasi AI jika sebelumnya gagal atau timeout
 */
export async function retryLeaveClassification(
  practicumId: string,
  sessionId: string,
  praktikanId: string,
  reason: string
): Promise<void> {
  try {
    const aiResult = await classifyLeaveReason(reason);
    await setDoc(
      classificationDocRef(practicumId, sessionId, praktikanId),
      { ai: aiResult, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error: any) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-19: Keputusan izin oleh asisten pengampu (terima / tolak)
 */
export async function decideLeaveRequest(params: {
  practicumId: string;
  sessionId: string;
  praktikanId: string;
  asistenId: string;
  decision: 'approved' | 'rejected';
  reviewNote?: string;
}): Promise<void> {
  const { practicumId, sessionId, praktikanId, asistenId, decision, reviewNote } = params;

  if (decision === 'rejected' && (!reviewNote || reviewNote.trim().length === 0)) {
    throw new Error('Catatan wajib diisi saat menolak izin.');
  }

  try {
    const leaveDocRef = doc(db, 'practicums', practicumId, 'sessions', sessionId, 'leaveRequests', praktikanId);
    const snap = await getDoc(leaveDocRef);

    if (!snap.exists()) {
      throw new Error('Pengajuan izin tidak ditemukan.');
    }
    if (snap.data()?.status !== 'pending') {
      throw new Error('Pengajuan izin ini sudah diputuskan sebelumnya.');
    }

    await updateDoc(leaveDocRef, {
      status: decision,
      decidedBy: asistenId,
      decidedAt: serverTimestamp(),
      reviewNote: reviewNote ? reviewNote.trim() : '',
    });
  } catch (error: any) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-15: Sinkronisasi real-time pengajuan izin milik praktikan pada satu sesi.
 *
 * Memakai listener DOKUMEN (bukan query koleksi) karena Firestore Rules
 * praktikan hanya mengizinkan membaca dokumennya sendiri; query koleksi tanpa
 * filter akan ditolak ("rules are not filters").
 */
export function subscribeOwnLeaveRequest(
  practicumId: string,
  sessionId: string,
  praktikanId: string,
  onData: (request: LeaveRequest | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const docRef = doc(
      db,
      'practicums',
      practicumId,
      'sessions',
      sessionId,
      'leaveRequests',
      praktikanId
    );

    return onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          onData(null);
          return;
        }

        const data = docSnap.data();
        onData({
          id: docSnap.id,
          praktikanId: data.praktikanId,
          praktikanName: data.praktikanName || 'Praktikan',
          praktikanNim: data.praktikanNim || '',
          reason: data.reason || '',
          status: data.status as LeaveStatus,
          createdAt: data.createdAt,
          decidedBy: data.decidedBy,
          decidedAt: data.decidedAt,
          reviewNote: data.reviewNote,
          sessionId,
          practicumId,
        });
      },
      (error) => {
        if (onError) onError(new Error(getHumanReadableErrorMessage(error)));
      }
    );
  } catch (err: any) {
    if (onError) onError(new Error(getHumanReadableErrorMessage(err)));
    return () => {};
  }
}

/**
 * FR-15: Sinkronisasi real-time daftar izin untuk satu sesi (dipakai asisten)
 */
export function subscribeSessionLeaveRequests(
  practicumId: string,
  sessionId: string,
  onData: (requests: LeaveRequest[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const colRef = collection(db, 'practicums', practicumId, 'sessions', sessionId, 'leaveRequests');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const requests: LeaveRequest[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          requests.push({
            id: docSnap.id,
            praktikanId: data.praktikanId,
            praktikanName: data.praktikanName || 'Praktikan',
            praktikanNim: data.praktikanNim || '',
            reason: data.reason || '',
            status: data.status as LeaveStatus,
            ai: data.ai,
            createdAt: data.createdAt,
            decidedBy: data.decidedBy,
            decidedAt: data.decidedAt,
            reviewNote: data.reviewNote,
            sessionId,
            practicumId,
          });
        });
        onData(requests);
      },
      (error) => {
        if (onError) onError(new Error(getHumanReadableErrorMessage(error)));
      }
    );
  } catch (err: any) {
    if (onError) onError(new Error(getHumanReadableErrorMessage(err)));
    return () => {};
  }
}

/**
 * FR-18: Sinkronisasi real-time hasil klasifikasi AI untuk asisten.
 * Mengembalikan map praktikanId -> LeaveClassification. Praktikan tidak
 * berlangganan ini karena Firestore Rules menolak bacaannya.
 */
export function subscribeSessionLeaveClassifications(
  practicumId: string,
  sessionId: string,
  onData: (classifications: Record<string, LeaveClassification>) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const colRef = collection(
      db,
      'practicums',
      practicumId,
      'sessions',
      sessionId,
      'leaveClassifications'
    );
    return onSnapshot(
      colRef,
      (snapshot) => {
        const classifications: Record<string, LeaveClassification> = {};
        snapshot.forEach((docSnap) => {
          const ai = docSnap.data()?.ai;
          if (ai && typeof ai === 'object') {
            classifications[docSnap.id] = ai as LeaveClassification;
          }
        });
        onData(classifications);
      },
      (error) => {
        if (onError) onError(new Error(getHumanReadableErrorMessage(error)));
      }
    );
  } catch (err: any) {
    if (onError) onError(new Error(getHumanReadableErrorMessage(err)));
    return () => {};
  }
}

/**
 * FR-15: Sinkronisasi real-time pengajuan izin milik praktikan untuk daftar
 * sesi yang diketahui aplikasi. Memakai listener dokumen per sesi karena
 * collection-group query memerlukan index khusus dan rules praktikan hanya
 * mengizinkan dokumennya sendiri.
 */
export function subscribeOwnLeaveRequests(
  targets: { practicumId: string; sessionId: string }[],
  praktikanId: string,
  onData: (requests: LeaveRequest[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const results = new Map<string, LeaveRequest>();
  const unsubscribes: Unsubscribe[] = [];

  const notify = () => {
    const list = Array.from(results.values()).sort(
      (a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
    );
    onData(list);
  };

  for (const target of targets) {
    const key = `${target.practicumId}|${target.sessionId}`;
    const docRef = doc(
      db,
      'practicums',
      target.practicumId,
      'sessions',
      target.sessionId,
      'leaveRequests',
      praktikanId
    );

    unsubscribes.push(
      onSnapshot(
        docRef,
        (docSnap) => {
          if (!docSnap.exists()) {
            results.delete(key);
            notify();
            return;
          }

          const data = docSnap.data();
          results.set(key, {
            id: docSnap.id,
            praktikanId: data.praktikanId,
            praktikanName: data.praktikanName || '',
            praktikanNim: data.praktikanNim || '',
            reason: data.reason || '',
            status: data.status as LeaveStatus,
            createdAt: data.createdAt,
            decidedBy: data.decidedBy,
            decidedAt: data.decidedAt,
            reviewNote: data.reviewNote,
            sessionId: target.sessionId,
            practicumId: target.practicumId,
          });
          notify();
        },
        (error) => {
          if (onError) onError(new Error(getHumanReadableErrorMessage(error)));
        }
      )
    );
  }

  return () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
  };
}

