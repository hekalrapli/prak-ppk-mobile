// src/services/leaveService.ts
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { LeaveClassification, LeaveRequest, LeaveStatus } from '../types/attendance';
import { classifyLeaveReason } from './leaveClassifier';
import { getHumanReadableErrorMessage, validateLeaveReason } from './errorHandler';
import { notifyLeaveDecision } from './pushDispatcher';

/**
 * Hasil klasifikasi AI disimpan di dokumen terpisah
 * (leaveClassifications/{uid}) agar hanya asisten pengampu yang dapat
 * membacanya. Sejak FR-18 direvisi, dokumen ini hanya ditulis oleh asisten
 * pengampu agar praktikan tidak dapat memalsukan hasil klasifikasi.
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
 * FR-17: Mengajukan izin oleh praktikan.
 * Memvalidasi alasan dan menyimpan dokumen ke
 * practicums/{pid}/sessions/{sid}/leaveRequests/{uid}. Klasifikasi AI tidak
 * lagi dijalankan di sini; asisten pengampu yang memicunya (FR-18).
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

    // 2. Simpan dokumen izin (tanpa hasil AI; praktikan tidak boleh melihatnya)
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

    await updateDoc(leaveDocRef, {
      reason: newReason.trim(),
    });
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
 * FR-18: Klasifikasi AI dijalankan dan disimpan oleh asisten pengampu.
 * Praktikan hanya mengirim alasan; hasil klasifikasi tidak dapat dipalsukan.
 */
export async function classifyLeaveRequest(
  practicumId: string,
  sessionId: string,
  praktikanId: string,
  reason: string
): Promise<LeaveClassification> {
  try {
    const aiResult = await classifyLeaveReason(reason);
    await setDoc(
      classificationDocRef(practicumId, sessionId, praktikanId),
      { ai: aiResult, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return aiResult;
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

  // FR-P2-02 & FR-P2-05: Kirim notifikasi non-blocking setelah keputusan izin tersimpan.
  void notifyLeaveDecision({
    practicumId,
    sessionId,
    praktikanId,
    decision,
    reviewNote: reviewNote ? reviewNote.trim() : undefined,
  }).catch(() => undefined);
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
 * FR-15: riwayat pengajuan izin milik praktikan lintas sesi.
 *
 * Memakai collection-group query dengan where('praktikanId','==',uid) agar
 * Security Rules dapat membuktikan kepemilikan tanpa membuka izin praktikan
 * lain, dan tidak perlu membuka satu listener per sesi.
 */
export function subscribeOwnLeaveHistory(
  praktikanId: string,
  onData: (requests: LeaveRequest[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const target = query(
      collectionGroup(db, 'leaveRequests'),
      where('praktikanId', '==', praktikanId)
    );

    return onSnapshot(
      target,
      (snapshot) => {
        const requests: LeaveRequest[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const segments = docSnap.ref.path.split('/');

          requests.push({
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
            sessionId: segments[3],
            practicumId: segments[1],
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

