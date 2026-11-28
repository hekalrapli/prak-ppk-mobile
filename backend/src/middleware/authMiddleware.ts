import type { NextFunction, Request, Response } from 'express';

import { getAdminAuth } from '../services/firebaseAdmin';

export interface AuthenticatedRequest extends Request {
  authUid?: string;
  authEmail?: string;
}

export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Header Authorization Bearer token Firebase wajib disertakan.',
    });
    return;
  }

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) {
    res.status(401).json({ error: 'Token autentikasi Firebase kosong.' });
    return;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    req.authUid = decoded.uid;
    req.authEmail = decoded.email;
    next();
  } catch (error) {
    console.warn(
      '[AuthMiddleware] Verifikasi Firebase ID Token gagal:',
      error instanceof Error ? error.message : error
    );
    res.status(401).json({
      error: 'Sesi login tidak valid atau telah kedaluwarsa. Silakan masuk ulang.',
    });
  }
}
