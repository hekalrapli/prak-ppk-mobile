import crypto from 'node:crypto';

import { getBackendEnv } from '../config/env';

export type AppPaymentStatus = 'pending' | 'success' | 'failed';

export interface MidtransCreateSnapParams {
  orderId: string;
  grossAmount: number;
  itemId: string;
  itemName: string;
  customerName: string;
  customerEmail?: string;
  fineId: string;
}

export interface MidtransCreateSnapResult {
  snapToken: string;
  redirectUrl: string;
}

export interface MidtransWebhookPayload {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
}

export interface MidtransStatusApiResponse {
  order_id?: string;
  status_code?: string;
  status_message?: string;
  gross_amount?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
}

const MIDTRANS_TIMEOUT_MS = 15_000;

function buildBasicAuthHeader(serverKey: string): string {
  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY belum dikonfigurasi di server.');
  }
  const encoded = Buffer.from(`${serverKey}:`).toString('base64');
  return `Basic ${encoded}`;
}

function timingSafeHexEqual(expectedHex: string, actualHex: string): boolean {
  const a = Buffer.from(expectedHex.trim().toLowerCase(), 'utf8');
  const b = Buffer.from(actualHex.trim().toLowerCase(), 'utf8');
  if (a.length !== b.length || a.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

/**
 * Menghasilkan `order_id` unik yang dijamin <= 50 karakter (batas wajib Midtrans).
 * Contoh hasil: `PK-m8x92k1-a4f8c2d91e3b` (~24 karakter, URL-safe).
 */
export function generateMidtransOrderId(): string {
  const timePart = Date.now().toString(36);
  const randPart = crypto.randomBytes(6).toString('hex');
  return `PK-${timePart}-${randPart}`;
}

/**
 * Memetakan `transaction_status` + `fraud_status` Midtrans ke 3 status standar Sprint 4:
 * `pending` | `success` | `failed`.
 */
export function mapMidtransStatus(
  transactionStatus?: string,
  fraudStatus?: string
): AppPaymentStatus {
  const status = (transactionStatus ?? '').trim().toLowerCase();
  const fraud = (fraudStatus ?? '').trim().toLowerCase();

  if (status === 'settlement') {
    return 'success';
  }
  if (status === 'capture') {
    if (fraud === 'deny') {
      return 'failed';
    }
    if (fraud === 'challenge') {
      return 'pending';
    }
    return 'success';
  }
  if (status === 'pending' || status === 'authorize') {
    return 'pending';
  }
  if (
    status === 'deny' ||
    status === 'cancel' ||
    status === 'expire' ||
    status === 'failure' ||
    status === 'refund' ||
    status === 'partial_refund' ||
    status === 'chargeback'
  ) {
    return 'failed';
  }

  return 'pending';
}

/**
 * Memverifikasi `signature_key` webhook Midtrans menggunakan SHA-512 secara constant-time:
 * `SHA-512(order_id + status_code + gross_amount + SecretKey)`.
 *
 * Mendukung `MIDTRANS_SIGNATURE_SECRET_KEY` (standar Scoped Access Keys Midtrans terbaru)
 * serta `MIDTRANS_SERVER_KEY` (akun Midtrans klasik) bila salah satu yang dipakai Midtrans.
 */
export function verifyMidtransWebhookSignature(
  payload: MidtransWebhookPayload,
  overrideKeys?: { signatureSecretKey?: string; serverKey?: string }
): boolean {
  const orderId = typeof payload.order_id === 'string' ? payload.order_id : '';
  const statusCode =
    typeof payload.status_code === 'string' ? payload.status_code : '';
  const grossAmount =
    typeof payload.gross_amount === 'string' ? payload.gross_amount : '';
  const signatureKey =
    typeof payload.signature_key === 'string' ? payload.signature_key : '';

  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    return false;
  }

  const env = getBackendEnv();
  const candidateKeys = Array.from(
    new Set(
      [
        overrideKeys?.signatureSecretKey ?? env.midtransSignatureSecretKey,
        overrideKeys?.serverKey ?? env.midtransServerKey,
      ]
        .map((key) => key.trim())
        .filter(Boolean)
    )
  );

  if (candidateKeys.length === 0) {
    return false;
  }

  return candidateKeys.some((secretKey) => {
    const expected = crypto
      .createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${secretKey}`)
      .digest('hex');
    return timingSafeHexEqual(expected, signatureKey);
  });
}

function sanitizeItemName(name: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N}\s.,()-]/gu, '').trim();
  const base = cleaned || 'Denda Keterlambatan Praktikum';
  return base.length > 50 ? `${base.slice(0, 47)}...` : base;
}

async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MIDTRANS_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as T | null;
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Memanggil Midtrans Snap API untuk membuat transaksi pembayaran denda.
 */
export async function createSnapTransaction(
  params: MidtransCreateSnapParams
): Promise<MidtransCreateSnapResult> {
  const env = getBackendEnv();
  const authHeader = buildBasicAuthHeader(env.midtransServerKey);
  const grossAmount = Math.round(params.grossAmount);

  const body = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: grossAmount,
    },
    item_details: [
      {
        id: params.itemId.slice(0, 50),
        price: grossAmount,
        quantity: 1,
        name: sanitizeItemName(params.itemName),
      },
    ],
    customer_details: {
      first_name: params.customerName.trim().slice(0, 50) || 'Praktikan',
      ...(params.customerEmail ? { email: params.customerEmail.trim() } : {}),
    },
    custom_field1: params.fineId.slice(0, 255),
  };

  const { ok, status, data } = await fetchJsonWithTimeout<{
    token?: string;
    redirect_url?: string;
    error_messages?: string[];
  }>(`${env.midtransSnapBaseUrl}/transactions`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  });

  if (!ok || !data?.token || !data?.redirect_url) {
    const detail = Array.isArray(data?.error_messages)
      ? data.error_messages.join('; ')
      : `HTTP ${status}`;
    throw new Error(`Gagal membuat transaksi Midtrans: ${detail}`);
  }

  return {
    snapToken: data.token,
    redirectUrl: data.redirect_url,
  };
}

/**
 * Mengecek status transaksi langsung server-to-server ke Midtrans Status API.
 */
export async function fetchMidtransTransactionStatus(
  orderId: string
): Promise<MidtransStatusApiResponse> {
  const env = getBackendEnv();
  const authHeader = buildBasicAuthHeader(env.midtransServerKey);

  const { ok, status, data } = await fetchJsonWithTimeout<MidtransStatusApiResponse>(
    `${env.midtransApiBaseUrl}/${encodeURIComponent(orderId)}/status`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authHeader,
      },
    }
  );

  if (!ok || !data) {
    throw new Error(
      `Gagal memeriksa status transaksi di Midtrans (HTTP ${status}).`
    );
  }

  if (data.status_code === '404') {
    throw new Error(
      'Transaksi belum tercatat di Midtrans. Selesaikan pemilihan metode bayar terlebih dahulu.'
    );
  }

  return data;
}

/**
 * Opsional best-effort: meng-expire order pending lama sebelum membuat order baru.
 * Kegagalan tidak pernah menghentikan pembuatan transaksi baru.
 */
export async function expireMidtransTransactionBestEffort(
  orderId: string
): Promise<void> {
  try {
    const env = getBackendEnv();
    if (!env.midtransServerKey) return;
    const authHeader = buildBasicAuthHeader(env.midtransServerKey);
    await fetchJsonWithTimeout(
      `${env.midtransApiBaseUrl}/${encodeURIComponent(orderId)}/expire`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: authHeader,
        },
      }
    );
  } catch {
    // Abaikan bila key tidak memiliki izin expire atau transaksi sudah final/belum dipilih.
  }
}
