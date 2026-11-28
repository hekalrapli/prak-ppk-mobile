import { FieldValue } from 'firebase-admin/firestore';

import { getAdminDb } from './firebaseAdmin';
import {
  createSnapTransaction,
  expireMidtransTransactionBestEffort,
  fetchMidtransTransactionStatus,
  generateMidtransOrderId,
  mapMidtransStatus,
  type AppPaymentStatus,
} from './midtransService';
import { sendPaymentResultNotification } from './pushNotifier';

export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface CreateTransactionResult {
  orderId: string;
  fineId: string;
  amount: number;
  snapToken: string;
  redirectUrl: string;
  status: AppPaymentStatus;
}

export interface SyncStatusResult {
  orderId: string;
  fineId: string;
  status: AppPaymentStatus;
  fineStatus: string;
  gatewayStatus: string;
  paymentType: string | null;
}

/**
 * FR-S4-P3-01 Endpoint 1: Membuat transaksi Midtrans Snap Sandbox dari tagihan Firestore.
 * Nominal `gross_amount` selalu diambil langsung dari `fines/{fineId}` (tidak pernah dari client).
 */
export async function createPaymentTransactionForFine(params: {
  callerUid: string;
  callerEmail?: string;
  fineId: string;
}): Promise<CreateTransactionResult> {
  const fineId = params.fineId.trim();
  if (!fineId || fineId.includes('/')) {
    throw new HttpError(400, 'ID tagihan denda tidak valid.');
  }

  const db = getAdminDb();
  const fineRef = db.collection('fines').doc(fineId);
  const fineSnap = await fineRef.get();

  if (!fineSnap.exists) {
    throw new HttpError(404, 'Tagihan denda tidak ditemukan.');
  }

  const fineData = fineSnap.data() ?? {};
  const praktikanId = String(fineData.praktikanId ?? '');
  if (praktikanId !== params.callerUid) {
    throw new HttpError(403, 'Anda tidak memiliki akses ke tagihan denda ini.');
  }

  const currentStatus = String(fineData.status ?? 'unpaid');
  if (currentStatus === 'success') {
    throw new HttpError(409, 'Tagihan denda ini sudah lunas.');
  }

  const amount = Math.round(Number(fineData.amount ?? 0));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError(400, 'Nominal tagihan denda tidak valid untuk dibayar.');
  }

  const praktikanName = String(fineData.praktikanName ?? 'Praktikan');
  const praktikanNim = String(fineData.praktikanNim ?? '');
  const practicumId = String(fineData.practicumId ?? '');
  const practicumName = String(fineData.practicumName ?? 'Praktikum');
  const sessionId = String(fineData.sessionId ?? '');
  const sessionDate = String(fineData.sessionDate ?? '');
  const previousOrderId =
    typeof fineData.latestOrderId === 'string' ? fineData.latestOrderId.trim() : '';

  // Opsional: coba nonaktifkan transaksi pending sebelumnya bila masih terbuka di Midtrans.
  if (previousOrderId && currentStatus === 'pending') {
    await expireMidtransTransactionBestEffort(previousOrderId);
  }

  // Ambil email praktikan dari `users/{uid}` bila belum ada di token auth.
  let customerEmail = params.callerEmail?.trim();
  if (!customerEmail) {
    const userSnap = await db.collection('users').doc(praktikanId).get();
    const emailFromDoc = userSnap.data()?.email;
    if (typeof emailFromDoc === 'string' && emailFromDoc.trim()) {
      customerEmail = emailFromDoc.trim();
    }
  }

  const orderId = generateMidtransOrderId();
  const snap = await createSnapTransaction({
    orderId,
    grossAmount: amount,
    itemId: fineId,
    itemName: `Denda ${practicumName}`,
    customerName: praktikanName,
    customerEmail,
    fineId,
  });

  const txRef = db.collection('paymentTransactions').doc(orderId);
  const batch = db.batch();

  batch.set(txRef, {
    orderId,
    fineId,
    praktikanId,
    praktikanName,
    praktikanNim,
    practicumId,
    practicumName,
    sessionId,
    sessionDate,
    amount,
    status: 'pending',
    paymentType: null,
    snapToken: snap.snapToken,
    redirectUrl: snap.redirectUrl,
    gatewayTransactionId: null,
    gatewayStatus: 'pending',
    fineCreatedAt: fineData.createdAt ?? FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.update(fineRef, {
    status: 'pending',
    latestOrderId: orderId,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    orderId,
    fineId,
    amount,
    snapToken: snap.snapToken,
    redirectUrl: snap.redirectUrl,
    status: 'pending',
  };
}

/**
 * Memperbarui `paymentTransactions/{orderId}` dan `fines/{fineId}` secara atomik & idempoten
 * berdasarkan data terverifikasi dari Midtrans (webhook atau Status API).
 *
 * ATURAN INTEGRITAS (Sprint 4 #4 / FR-S4-P2-04):
 * Fungsi ini TIDAK PERNAH menyentuh dokumen `attendance/{uid}`.
 */
export async function applyVerifiedMidtransUpdate(params: {
  orderId: string;
  transactionStatus?: string;
  fraudStatus?: string;
  paymentType?: string;
  gatewayTransactionId?: string;
  grossAmount?: string;
}): Promise<{
  changed: boolean;
  status: AppPaymentStatus;
  fineId: string;
  fineStatus: string;
  paymentType: string | null;
}> {
  const orderId = params.orderId.trim();
  if (!orderId) {
    throw new HttpError(400, 'order_id wajib diisi.');
  }

  const db = getAdminDb();
  const txRef = db.collection('paymentTransactions').doc(orderId);
  const nextStatus = mapMidtransStatus(params.transactionStatus, params.fraudStatus);
  const normalizedGatewayStatus = (params.transactionStatus ?? 'pending')
    .trim()
    .toLowerCase();

  let notificationTarget: {
    praktikanId: string;
    status: 'success' | 'failed';
    fineId: string;
    orderId: string;
    practicumName: string;
    amount: number;
  } | null = null;

  const outcome = await db.runTransaction(async (tx) => {
    const txSnap = await tx.get(txRef);
    if (!txSnap.exists) {
      throw new HttpError(404, `Transaksi ${orderId} tidak ditemukan.`);
    }

    const txData = txSnap.data() ?? {};
    const fineId = String(txData.fineId ?? '');
    const expectedAmount = Math.round(Number(txData.amount ?? 0));
    const currentTxStatus = String(txData.status ?? 'pending') as AppPaymentStatus;

    if (params.grossAmount !== undefined) {
      const incomingAmount = Math.round(Number(params.grossAmount));
      if (
        Number.isFinite(incomingAmount) &&
        expectedAmount > 0 &&
        incomingAmount !== expectedAmount
      ) {
        throw new HttpError(
          400,
          'Nominal pada notifikasi Midtrans tidak cocok dengan nominal tagihan.'
        );
      }
    }

    const fineRef = fineId ? db.collection('fines').doc(fineId) : null;
    const fineSnap = fineRef ? await tx.get(fineRef) : null;
    const fineData = fineSnap?.exists ? (fineSnap.data() ?? {}) : null;
    const currentFineStatus = String(fineData?.status ?? 'pending');

    const resolvedPaymentType =
      typeof params.paymentType === 'string' && params.paymentType.trim()
        ? params.paymentType.trim()
        : typeof txData.paymentType === 'string'
          ? txData.paymentType
          : null;

    // Idempoten: jangan menurunkan transaksi yang sudah `success`.
    if (currentTxStatus === 'success') {
      return {
        changed: false,
        status: 'success' as AppPaymentStatus,
        fineId,
        fineStatus: currentFineStatus,
        paymentType: resolvedPaymentType,
      };
    }

    const statusChanged = currentTxStatus !== nextStatus;
    const txUpdate: Record<string, unknown> = {
      status: nextStatus,
      paymentType: resolvedPaymentType,
      gatewayStatus: normalizedGatewayStatus,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (
      typeof params.gatewayTransactionId === 'string' &&
      params.gatewayTransactionId.trim()
    ) {
      txUpdate.gatewayTransactionId = params.gatewayTransactionId.trim();
    }
    if (nextStatus === 'success') {
      txUpdate.paidAt = FieldValue.serverTimestamp();
    }

    tx.update(txRef, txUpdate);

    let nextFineStatus = currentFineStatus;
    if (fineRef && fineData) {
      const isLatestOrder =
        !fineData.latestOrderId || String(fineData.latestOrderId) === orderId;

      if (currentFineStatus !== 'success') {
        if (nextStatus === 'success') {
          nextFineStatus = 'success';
          tx.update(fineRef, {
            status: 'success',
            latestOrderId: orderId,
            paidAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else if (isLatestOrder && currentFineStatus !== nextStatus) {
          nextFineStatus = nextStatus;
          tx.update(fineRef, {
            status: nextStatus,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // Kirim push notification hanya sekali ketika transisi mencapai status final.
    if (statusChanged && (nextStatus === 'success' || nextStatus === 'failed')) {
      const praktikanId = String(txData.praktikanId ?? '');
      const practicumName = String(txData.practicumName ?? 'Praktikum');
      if (praktikanId) {
        notificationTarget = {
          praktikanId,
          status: nextStatus,
          fineId,
          orderId,
          practicumName,
          amount: expectedAmount,
        };
      }
    }

    return {
      changed: statusChanged,
      status: nextStatus,
      fineId,
      fineStatus: nextFineStatus,
      paymentType: resolvedPaymentType,
    };
  });

  if (notificationTarget) {
    await sendPaymentResultNotification(notificationTarget);
  }

  return outcome;
}

/**
 * FR-S4-P3-01 Endpoint 3: Verifikasi status transaksi server-to-server ke Midtrans Status API.
 */
export async function syncOrderStatusWithMidtrans(params: {
  callerUid: string;
  orderId: string;
}): Promise<SyncStatusResult> {
  const orderId = params.orderId.trim();
  if (!orderId || orderId.includes('/')) {
    throw new HttpError(400, 'Order ID tidak valid.');
  }

  const db = getAdminDb();
  const txSnap = await db.collection('paymentTransactions').doc(orderId).get();
  if (!txSnap.exists) {
    throw new HttpError(404, 'Transaksi pembayaran tidak ditemukan.');
  }

  const txData = txSnap.data() ?? {};
  const ownerUid = String(txData.praktikanId ?? '');
  if (ownerUid !== params.callerUid) {
    const callerDoc = await db.collection('users').doc(params.callerUid).get();
    if (callerDoc.data()?.role !== 'aslab') {
      throw new HttpError(403, 'Anda tidak memiliki akses ke transaksi ini.');
    }
  }

  const midtransStatus = await fetchMidtransTransactionStatus(orderId);
  const updated = await applyVerifiedMidtransUpdate({
    orderId,
    transactionStatus: midtransStatus.transaction_status,
    fraudStatus: midtransStatus.fraud_status,
    paymentType: midtransStatus.payment_type,
    gatewayTransactionId: midtransStatus.transaction_id,
    grossAmount: midtransStatus.gross_amount,
  });

  return {
    orderId,
    fineId: updated.fineId,
    status: updated.status,
    fineStatus: updated.fineStatus,
    gatewayStatus: String(midtransStatus.transaction_status ?? updated.status),
    paymentType: updated.paymentType,
  };
}
