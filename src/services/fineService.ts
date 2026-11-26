// src/services/fineService.ts
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { getDeterministicFineId } from '../lib/lateness';
import type { FineDoc, FineStatus, FirestoreTimestamp } from '../types/attendance';
import { getHumanReadableErrorMessage } from './errorHandler';
import { db } from './firebase';

export { getDeterministicFineId };

export interface FineFinancialSummary {
  totalCollected: number; // total nominal denda yang sudah sukses dibayar (status == 'success')
  totalPending: number; // total nominal denda yang belum dibayar / menunggu (status == 'unpaid' || 'pending')
  totalFineEvents: number; // total kejadian keterlambatan
  successCount: number; // jumlah tagihan sukses
  unpaidCount: number; // jumlah tagihan tertunggak/menunggu
  failedCount: number; // jumlah tagihan gagal
  fines: FineDoc[];
}

function mapFineDoc(id: string, data: Record<string, unknown>): FineDoc {
  const statusRaw = data.status;
  const status: FineStatus =
    statusRaw === 'pending' || statusRaw === 'success' || statusRaw === 'failed'
      ? statusRaw
      : 'unpaid';

  return {
    id,
    praktikanId: String(data.praktikanId ?? ''),
    praktikanName: String(data.praktikanName ?? 'Praktikan'),
    praktikanNim: String(data.praktikanNim ?? ''),
    practicumId: String(data.practicumId ?? ''),
    practicumName: String(data.practicumName ?? 'Praktikum'),
    sessionId: String(data.sessionId ?? ''),
    sessionDate: String(data.sessionDate ?? ''),
    labId: String(data.labId ?? ''),
    labName: String(data.labName ?? 'Laboratorium'),
    attendanceId: String(data.attendanceId ?? data.praktikanId ?? ''),
    lateMinutes: Number(data.lateMinutes ?? 0),
    gracePeriodMinutes: Number(data.gracePeriodMinutes ?? 15),
    amount: Number(data.amount ?? 0),
    status,
    latestOrderId:
      typeof data.latestOrderId === 'string' ? data.latestOrderId : undefined,
    createdAt: data.createdAt as FirestoreTimestamp,
    paidAt: (data.paidAt ?? undefined) as FirestoreTimestamp | undefined,
    updatedAt: (data.updatedAt ?? undefined) as FirestoreTimestamp | undefined,
  };
}

/**
 * Mengambil dokumen denda tunggal berdasarkan ID deterministik
 */
export async function getFine(fineId: string): Promise<FineDoc | null> {
  try {
    const snap = await getDoc(doc(db, 'fines', fineId));
    if (!snap.exists()) return null;
    return mapFineDoc(snap.id, snap.data());
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-S4-P2-03: Sinkronisasi real-time tagihan denda milik praktikan tertentu
 */
export function subscribeFinesByPraktikan(
  praktikanId: string,
  onData: (fines: FineDoc[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, 'fines'),
      where('praktikanId', '==', praktikanId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const fines: FineDoc[] = [];
        snapshot.forEach((docSnap) => {
          fines.push(mapFineDoc(docSnap.id, docSnap.data()));
        });
        onData(fines);
      },
      (error) => onError?.(new Error(getHumanReadableErrorMessage(error)))
    );
  } catch (error) {
    onError?.(new Error(getHumanReadableErrorMessage(error)));
    return () => {};
  }
}

/**
 * Sinkronisasi real-time denda untuk satu sesi tertentu (asisten pengampu)
 */
export function subscribeFinesBySession(
  sessionId: string,
  onData: (fines: FineDoc[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, 'fines'),
      where('sessionId', '==', sessionId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const fines: FineDoc[] = [];
        snapshot.forEach((docSnap) => {
          fines.push(mapFineDoc(docSnap.id, docSnap.data()));
        });
        onData(fines);
      },
      (error) => onError?.(new Error(getHumanReadableErrorMessage(error)))
    );
  } catch (error) {
    onError?.(new Error(getHumanReadableErrorMessage(error)));
    return () => {};
  }
}

/**
 * FR-S4-P2-02: Sinkronisasi seluruh tagihan denda untuk Dashboard Aslab
 */
export function subscribeAllFines(
  onData: (fines: FineDoc[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    return onSnapshot(
      collection(db, 'fines'),
      (snapshot) => {
        const fines: FineDoc[] = [];
        snapshot.forEach((docSnap) => {
          fines.push(mapFineDoc(docSnap.id, docSnap.data()));
        });
        onData(fines);
      },
      (error) => onError?.(new Error(getHumanReadableErrorMessage(error)))
    );
  } catch (error) {
    onError?.(new Error(getHumanReadableErrorMessage(error)));
    return () => {};
  }
}

/**
 * Helper untuk mengekstrak epoch ms dari createdAt atau sessionDate
 */
export function getFineTimestampMillis(fine: FineDoc): number {
  const ca = fine.createdAt as any;
  if (ca && typeof ca.toMillis === 'function') {
    return ca.toMillis();
  }
  if (ca && typeof ca.seconds === 'number') {
    return ca.seconds * 1000;
  }
  if (ca instanceof Date) {
    return ca.getTime();
  }
  if (typeof ca === 'number') {
    return ca;
  }
  if (typeof ca === 'string') {
    const parsed = Date.parse(ca);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

/**
 * Filter daftar denda berdasarkan periode waktu: 'day' (hari ini), 'week' (minggu ini), 'month' (bulan ini)
 */
export function filterFinesByPeriod(
  fines: FineDoc[],
  period: 'day' | 'week' | 'month'
): FineDoc[] {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  // Minggu ini: mulai dari hari Senin
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Senin, 6 = Minggu
  const startOfWeek = startOfDay - dayOfWeek * 24 * 60 * 60 * 1000;
  const endOfWeek = startOfWeek + 7 * 24 * 60 * 60 * 1000 - 1;

  // Bulan ini
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

  let minTime = startOfDay;
  let maxTime = endOfDay;

  if (period === 'week') {
    minTime = startOfWeek;
    maxTime = endOfWeek;
  } else if (period === 'month') {
    minTime = startOfMonth;
    maxTime = endOfMonth;
  }

  return fines.filter((fine) => {
    const time = getFineTimestampMillis(fine);
    if (time === 0) return true; // jika timestamp belum tersinkronisasi, sertakan agar tidak hilang
    return time >= minTime && time <= maxTime;
  });
}

/**
 * Menghitung metrik ringkasan keuangan denda
 */
export function calculateFineFinancialSummary(fines: FineDoc[]): FineFinancialSummary {
  let totalCollected = 0;
  let totalPending = 0;
  let successCount = 0;
  let unpaidCount = 0;
  let failedCount = 0;

  for (const fine of fines) {
    const amount = Number.isFinite(fine.amount) ? fine.amount : 0;
    if (fine.status === 'success') {
      totalCollected += amount;
      successCount += 1;
    } else if (fine.status === 'unpaid' || fine.status === 'pending') {
      totalPending += amount;
      unpaidCount += 1;
    } else if (fine.status === 'failed') {
      failedCount += 1;
    }
  }

  const sorted = [...fines].sort((a, b) => {
    return getFineTimestampMillis(b) - getFineTimestampMillis(a);
  });

  return {
    totalCollected,
    totalPending,
    totalFineEvents: fines.length,
    successCount,
    unpaidCount,
    failedCount,
    fines: sorted,
  };
}
