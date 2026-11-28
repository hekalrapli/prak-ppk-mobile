import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { getBackendEnv } from './config/env';
import {
  requireFirebaseAuth,
  type AuthenticatedRequest,
} from './middleware/authMiddleware';
import {
  verifyMidtransWebhookSignature,
  type MidtransWebhookPayload,
} from './services/midtransService';
import {
  applyVerifiedMidtransUpdate,
  createPaymentTransactionForFine,
  HttpError,
  syncOrderStatusWithMidtrans,
} from './services/paymentProcessor';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    const env = getBackendEnv();
    res.status(200).json({
      ok: true,
      service: 'prakyuks-payment-backend',
      mode: env.midtransIsProduction ? 'production' : 'sandbox',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Endpoint 1: POST /api/payments/create-transaction
   * Terautentikasi Firebase ID Token. Membuat transaksi Midtrans Snap Sandbox
   * menggunakan nominal asli dari dokumen `fines/{fineId}` di Firestore.
   */
  app.post(
    '/api/payments/create-transaction',
    requireFirebaseAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const fineId =
          typeof req.body?.fineId === 'string' ? req.body.fineId : '';
        if (!fineId.trim()) {
          throw new HttpError(400, 'Field fineId wajib diisi.');
        }

        const result = await createPaymentTransactionForFine({
          callerUid: req.authUid!,
          callerEmail: req.authEmail,
          fineId,
        });

        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Endpoint 2: POST /api/payments/webhook
   * Menerima HTTP notification dari Midtrans Sandbox, memverifikasi signature_key
   * SHA-512 secara constant-time, memperbarui Firestore secara atomik, dan mengirim push notif.
   */
  app.post(
    '/api/payments/webhook',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const payload = (req.body ?? {}) as MidtransWebhookPayload;

        const signatureValid = verifyMidtransWebhookSignature(payload);
        if (!signatureValid) {
          res.status(403).json({ error: 'Signature webhook Midtrans tidak valid.' });
          return;
        }

        const orderId = typeof payload.order_id === 'string' ? payload.order_id : '';
        if (!orderId) {
          res.status(400).json({ error: 'order_id tidak ditemukan pada payload webhook.' });
          return;
        }

        try {
          const result = await applyVerifiedMidtransUpdate({
            orderId,
            transactionStatus: payload.transaction_status,
            fraudStatus: payload.fraud_status,
            paymentType: payload.payment_type,
            gatewayTransactionId: payload.transaction_id,
            grossAmount: payload.gross_amount,
          });

          res.status(200).json({
            received: true,
            orderId,
            status: result.status,
            changed: result.changed,
          });
        } catch (err) {
          // Test notification dari dashboard Midtrans mengirim order_id dummy (mis. payment_notif_test_...)
          // yang tidak ada di Firestore; balas 200 OK bila signature sah agar test webhook dashboard hijau.
          if (err instanceof HttpError && err.statusCode === 404) {
            res.status(200).json({
              received: true,
              ignored: true,
              reason: 'order_not_found',
            });
            return;
          }
          throw err;
        }
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Endpoint 3: GET /api/payments/status/:orderId
   * Fallback verifikasi server-to-server langsung ke Midtrans Status API.
   */
  app.get(
    '/api/payments/status/:orderId',
    requireFirebaseAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const orderId = String(req.params.orderId ?? '');
        const result = await syncOrderStatusWithMidtrans({
          callerUid: req.authUid!,
          orderId,
        });
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
  });

  app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (err instanceof HttpError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }

      console.error('[PaymentBackend] Error tak terduga:', err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Terjadi kesalahan pada server pembayaran.';
      res.status(500).json({ error: message });
    }
  );

  return app;
}
