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
  collectionGroup,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { LeaveRequest, LeaveStatus } from '../types/attendance';
import { classifyLeaveReason } from './leaveClassifier';
import { getHumanReadableErrorMessage, validateLeaveReason } from './errorHandler';

/**
 * FR-17 & FR-18: Mengajukan izin oleh praktikan.
 * Memvalidasi alasan, memanggil model AI, dan menyimpan dokumen ke
 * practicums/{pid}/sessions/{sid}/leaveRequests/{uid}.
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
      throw new Error('Anda sudah mengajukan izin untuk sesi ini.');
    }

    // 2. Panggil klasifikasi AI (FR-18)
    // AI gagal tidak membatalkan pengajuan, tetap disimpan dengan state failed
    const aiResult = await classifyLeaveReason(reason);

    // 3. Simpan dokumen izin
    const newRequest: LeaveRequest = {
      praktikanId,
      praktikanName,
      praktikanNim,
      reason: reason.trim(),
      status: 'pending',
      ai: aiResult,
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
      ai: aiResult,
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

    const aiResult = await classifyLeaveReason(newReason);

    await updateDoc(leaveDocRef, {
      reason: newReason.trim(),
      ai: aiResult,
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
 * FR-18: Mencoba ulang klasifikasi AI jika sebelumnya gagal atau timeout
 */
export async function retryLeaveClassification(
  practicumId: string,
  sessionId: string,
  praktikanId: string,
  reason: string
): Promise<void> {
  try {
    const leaveDocRef = doc(db, 'practicums', practicumId, 'sessions', sessionId, 'leaveRequests', praktikanId);
    const aiResult = await classifyLeaveReason(reason);
    await updateDoc(leaveDocRef, {
      ai: aiResult,
    });
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
 * FR-15: Sinkronisasi real-time daftar izin untuk satu sesi
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
 * FR-15: Sinkronisasi real-time semua pengajuan izin praktikan lintas sesi
 */
export function subscribeUserLeaveRequests(
  praktikanId: string,
  onData: (requests: LeaveRequest[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(collectionGroup(db, 'leaveRequests'), where('praktikanId', '==', praktikanId));
    return onSnapshot(
      q,
      (snapshot) => {
        const requests: LeaveRequest[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const segments = docSnap.ref.path.split('/');
          const pid = segments[1];
          const sid = segments[3];

          requests.push({
            id: docSnap.id,
            praktikanId: data.praktikanId,
            praktikanName: data.praktikanName || '',
            praktikanNim: data.praktikanNim || '',
            reason: data.reason || '',
            status: data.status as LeaveStatus,
            ai: data.ai,
            createdAt: data.createdAt,
            decidedBy: data.decidedBy,
            decidedAt: data.decidedAt,
            reviewNote: data.reviewNote,
            sessionId: sid,
            practicumId: pid,
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

