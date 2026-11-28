import { getAdminDb } from './firebaseAdmin';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_TOKEN_REGEX = /^ExponentPushToken\[.+\]$/;
const PUSH_TIMEOUT_MS = 10_000;

export function formatRupiah(amount: number): string {
  const safe = Math.max(0, Math.trunc(Number.isFinite(amount) ? amount : 0));
  return `Rp ${safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function isValidExpoPushToken(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 20 &&
    value.length <= 120 &&
    EXPO_PUSH_TOKEN_REGEX.test(value)
  );
}

/**
 * FR-S4-P3-03: Mengirim push notification `payment_success` atau `payment_failed`
 * ke perangkat praktikan melalui Expo Push API setelah verifikasi Midtrans selesai.
 * Bersifat non-blocking dan tidak pernah melempar error agar webhook tetap membalas 200 OK.
 */
export async function sendPaymentResultNotification(params: {
  praktikanId: string;
  status: 'success' | 'failed';
  fineId: string;
  orderId: string;
  practicumName: string;
  amount: number;
}): Promise<void> {
  try {
    const db = getAdminDb();
    const userSnap = await db.collection('users').doc(params.praktikanId).get();
    if (!userSnap.exists) {
      return;
    }

    const rawTokens = userSnap.data()?.fcm_tokens;
    const tokens = Array.isArray(rawTokens)
      ? Array.from(new Set(rawTokens.filter(isValidExpoPushToken)))
      : [];

    if (tokens.length === 0) {
      return;
    }

    const isSuccess = params.status === 'success';
    const type = isSuccess ? 'payment_success' : 'payment_failed';
    const title = isSuccess
      ? 'Pembayaran Denda Berhasil'
      : 'Pembayaran Denda Belum Berhasil';
    const body = isSuccess
      ? `Pembayaran denda ${params.practicumName} sebesar ${formatRupiah(params.amount)} telah berhasil diverifikasi.`
      : `Pembayaran denda ${params.practicumName} gagal atau kedaluwarsa. Silakan lakukan pembayaran ulang.`;

    const messages = tokens.map((to) => ({
      to,
      title,
      body,
      sound: 'default',
      channelId: 'default',
      priority: 'high',
      data: {
        type,
        fineId: params.fineId,
        orderId: params.orderId,
      },
    }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);

    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(
          `[PushNotifier] Expo Push API merespons HTTP ${response.status} untuk order ${params.orderId}.`
        );
      }
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.warn(
      '[PushNotifier] Gagal mengirim push notification pembayaran:',
      error instanceof Error ? error.message : error
    );
  }
}
