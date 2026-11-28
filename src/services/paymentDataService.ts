// src/services/paymentDataService.ts
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import type {
  FineDoc,
  FineStatus,
  FirestoreTimestamp,
  PaymentTransactionDoc,
  PaymentTransactionStatus,
} from '@/types/attendance';
import { getHumanReadableErrorMessage } from './errorHandler';
import { db } from './firebase';

const MONTHS_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

export function timestampToEpochMs(ts: FirestoreTimestamp | undefined): number {
  if (!ts) return 0;
  if (typeof ts === 'number') return Number.isFinite(ts) ? ts : 0;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof ts === 'object') {
    if ('toDate' in ts && typeof ts.toDate === 'function') {
      return ts.toDate().getTime();
    }
    if ('seconds' in ts && typeof ts.seconds === 'number') {
      return ts.seconds * 1000;
    }
  }
  return 0;
}

export function formatTimestampDate(ts: FirestoreTimestamp | undefined): string {
  const ms = timestampToEpochMs(ts);
  if (ms <= 0) return '—';
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTimestampDateTimeWib(
  ts: FirestoreTimestamp | undefined
): string {
  const ms = timestampToEpochMs(ts);
  if (ms <= 0) return '—';
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS_SHORT_ID[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm} WIB`;
}

export function formatPaymentMethodLabel(paymentType?: string | null): string {
  if (!paymentType) return 'Midtrans Sandbox';
  const normalized = paymentType.trim().toLowerCase();
  const labels: Record<string, string> = {
    bank_transfer: 'Transfer Bank (VA)',
    echannel: 'Mandiri Bill (VA)',
    permata: 'Permata VA',
    qris: 'QRIS',
    gopay: 'GoPay',
    shopeepay: 'ShopeePay',
    credit_card: 'Kartu Kredit/Debit',
    cstore: 'Gerai Retail',
    akulaku: 'Akulaku',
    kredivo: 'Kredivo',
  };
  return labels[normalized] ?? paymentType.replace(/_/g, ' ');
}

function parseFineStatus(raw: unknown): FineStatus {
  if (raw === 'pending' || raw === 'success' || raw === 'failed') {
    return raw;
  }
  return 'unpaid';
}

function parseTransactionStatus(raw: unknown): PaymentTransactionStatus {
  if (raw === 'success' || raw === 'failed') {
    return raw;
  }
  return 'pending';
}

export function mapFineDoc(id: string, data: DocumentData): FineDoc {
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
    lateMinutes: Math.max(0, Math.trunc(Number(data.lateMinutes ?? 0) || 0)),
    gracePeriodMinutes: Math.max(
      0,
      Math.trunc(Number(data.gracePeriodMinutes ?? 15) || 0)
    ),
    amount: Math.max(0, Math.trunc(Number(data.amount ?? 0) || 0)),
    status: parseFineStatus(data.status),
    latestOrderId:
      typeof data.latestOrderId === 'string' && data.latestOrderId.trim()
        ? data.latestOrderId.trim()
        : undefined,
    createdAt: (data.createdAt as FirestoreTimestamp | undefined) ?? null,
    paidAt: (data.paidAt as FirestoreTimestamp | undefined) ?? undefined,
    updatedAt: (data.updatedAt as FirestoreTimestamp | undefined) ?? undefined,
  };
}

export function mapPaymentTransactionDoc(
  orderId: string,
  data: DocumentData
): PaymentTransactionDoc {
  return {
    orderId: typeof data.orderId === 'string' && data.orderId ? data.orderId : orderId,
    fineId: String(data.fineId ?? ''),
    praktikanId: String(data.praktikanId ?? ''),
    praktikanName: String(data.praktikanName ?? 'Praktikan'),
    praktikanNim: String(data.praktikanNim ?? ''),
    practicumId: String(data.practicumId ?? ''),
    practicumName: String(data.practicumName ?? 'Praktikum'),
    sessionId: String(data.sessionId ?? ''),
    sessionDate: String(data.sessionDate ?? ''),
    amount: Math.max(0, Math.trunc(Number(data.amount ?? 0) || 0)),
    status: parseTransactionStatus(data.status),
    paymentType:
      typeof data.paymentType === 'string' && data.paymentType.trim()
        ? data.paymentType.trim()
        : undefined,
    snapToken:
      typeof data.snapToken === 'string' && data.snapToken.trim()
        ? data.snapToken.trim()
        : undefined,
    redirectUrl:
      typeof data.redirectUrl === 'string' && data.redirectUrl.trim()
        ? data.redirectUrl.trim()
        : undefined,
    gatewayTransactionId:
      typeof data.gatewayTransactionId === 'string' && data.gatewayTransactionId.trim()
        ? data.gatewayTransactionId.trim()
        : undefined,
    gatewayStatus:
      typeof data.gatewayStatus === 'string' && data.gatewayStatus.trim()
        ? data.gatewayStatus.trim()
        : undefined,
    fineCreatedAt: (data.fineCreatedAt as FirestoreTimestamp | undefined) ?? null,
    createdAt: (data.createdAt as FirestoreTimestamp | undefined) ?? null,
    paidAt: (data.paidAt as FirestoreTimestamp | undefined) ?? undefined,
    updatedAt: (data.updatedAt as FirestoreTimestamp | undefined) ?? undefined,
  };
}

/**
 * FR-S4-P3-02: Listener real-time daftar tagihan denda milik praktikan tertentu.
 * Disortir terbaru di atas di klien agar tidak bergantung pada composite index.
 */
export function subscribePraktikanFines(
  praktikanId: string,
  onData: (fines: FineDoc[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, 'fines'),
      where('praktikanId', '==', praktikanId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((docSnap) => mapFineDoc(docSnap.id, docSnap.data()))
          .sort(
            (a, b) =>
              timestampToEpochMs(b.createdAt) - timestampToEpochMs(a.createdAt)
          );
        onData(list);
      },
      (error) => onError?.(getHumanReadableErrorMessage(error))
    );
  } catch (error) {
    onError?.(getHumanReadableErrorMessage(error));
    return () => {};
  }
}

/**
 * FR-S4-P3-02: Listener real-time satu dokumen tagihan `fines/{fineId}`.
 */
export function subscribeFineById(
  fineId: string,
  onData: (fine: FineDoc | null) => void,
  onError?: (message: string) => void
): Unsubscribe {
  try {
    return onSnapshot(
      doc(db, 'fines', fineId),
      (snapshot) => {
        onData(snapshot.exists() ? mapFineDoc(snapshot.id, snapshot.data()) : null);
      },
      (error) => onError?.(getHumanReadableErrorMessage(error))
    );
  } catch (error) {
    onError?.(getHumanReadableErrorMessage(error));
    return () => {};
  }
}

/**
 * FR-S4-P3-04: Listener real-time seluruh riwayat transaksi pembayaran milik praktikan
 * dari koleksi `paymentTransactions` (persisten lintas restart/force close).
 */
export function subscribePraktikanPaymentTransactions(
  praktikanId: string,
  onData: (transactions: PaymentTransactionDoc[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  try {
    const q = query(
      collection(db, 'paymentTransactions'),
      where('praktikanId', '==', praktikanId)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((docSnap) => mapPaymentTransactionDoc(docSnap.id, docSnap.data()))
          .sort(
            (a, b) =>
              timestampToEpochMs(b.createdAt) - timestampToEpochMs(a.createdAt)
          );
        onData(list);
      },
      (error) => onError?.(getHumanReadableErrorMessage(error))
    );
  } catch (error) {
    onError?.(getHumanReadableErrorMessage(error));
    return () => {};
  }
}
