// src/services/paymentApi.ts
import type { PaymentTransactionStatus } from '@/types/attendance';
import { auth } from './firebase';

const REQUEST_TIMEOUT_MS = 20_000;

export interface CreatePaymentTransactionResponse {
  orderId: string;
  fineId: string;
  amount: number;
  snapToken: string;
  redirectUrl: string;
  status: PaymentTransactionStatus;
}

export interface VerifyPaymentStatusResponse {
  orderId: string;
  fineId: string;
  status: PaymentTransactionStatus;
  fineStatus: string;
  gatewayStatus: string;
  paymentType: string | null;
}

/**
 * URL dasar backend pembayaran publik (bukan rahasia).
 * Seluruh kunci rahasia Midtrans hanya tersimpan di server backend.
 */
export function getPaymentApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_PAYMENT_API_URL ?? '';
  return raw.trim().replace(/\/+$/, '');
}

export function isPaymentApiConfigured(): boolean {
  const baseUrl = getPaymentApiBaseUrl();
  return /^https?:\/\/.+/i.test(baseUrl);
}

async function getFirebaseBearerToken(): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Sesi login tidak aktif. Silakan masuk ulang.');
  }
  return currentUser.getIdToken();
}

async function requestBackendJson<T>(
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown }
): Promise<T> {
  const baseUrl = getPaymentApiBaseUrl();
  if (!/^https?:\/\/.+/i.test(baseUrl)) {
    throw new Error(
      'URL backend pembayaran belum diatur. Isi EXPO_PUBLIC_PAYMENT_API_URL di file .env.'
    );
  }

  const token = await getFirebaseBearerToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: init.method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => null)) as
      | (T & { error?: string })
      | null;

    if (!response.ok) {
      const serverMessage =
        typeof data?.error === 'string' && data.error.trim()
          ? data.error.trim()
          : `Server pembayaran merespons kesalahan (HTTP ${response.status}).`;
      throw new Error(serverMessage);
    }

    if (!data) {
      throw new Error('Respons server pembayaran tidak valid.');
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'Permintaan ke server pembayaran melewati batas waktu. Periksa koneksi internet Anda lalu coba lagi.'
      );
    }
    if (
      error instanceof Error &&
      /network request failed|failed to fetch/i.test(error.message)
    ) {
      throw new Error(
        'Tidak dapat terhubung ke server pembayaran. Pastikan koneksi internet aktif dan server berjalan.'
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * FR-S4-P3-02: Meminta backend membuat transaksi Midtrans Snap Sandbox
 * menggunakan nominal denda asli di Firestore.
 */
export async function createFinePaymentTransaction(
  fineId: string
): Promise<CreatePaymentTransactionResponse> {
  return requestBackendJson<CreatePaymentTransactionResponse>(
    '/api/payments/create-transaction',
    {
      method: 'POST',
      body: { fineId },
    }
  );
}

/**
 * FR-S4-P3-01 & FR-S4-P3-02: Meminta backend memverifikasi status pembayaran
 * server-to-server ke Midtrans Status API dan menyinkronkannya ke Firestore.
 */
export async function verifyPaymentOrderStatus(
  orderId: string
): Promise<VerifyPaymentStatusResponse> {
  return requestBackendJson<VerifyPaymentStatusResponse>(
    `/api/payments/status/${encodeURIComponent(orderId)}`,
    {
      method: 'GET',
    }
  );
}
