// src/services/qrPresenceService.ts
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { generateQrToken } from '../lib/qr-presence';
import { getHumanReadableErrorMessage } from './errorHandler';
import { db } from './firebase';

function getQrTokenDocRef(practicumId: string, sessionId: string) {
  return doc(db, 'practicums', practicumId, 'sessions', sessionId, 'qr_token', 'current');
}

/**
 * Memutar token QR aktif pada dokumen terpisah `qr_token/current` yang hanya dapat
 * dibaca dan ditulis oleh asisten pengampu. Menyimpan `previous_token` sebagai
 * masa tenggang agar pemindaian tepat di detik rotasi tidak gagal.
 */
export async function rotateSessionQrToken(
  practicumId: string,
  sessionId: string
): Promise<{ token: string }> {
  try {
    const qrRef = getQrTokenDocRef(practicumId, sessionId);
    const snapshot = await getDoc(qrRef);

    if (!snapshot.exists()) {
      const nextToken = generateQrToken();
      await setDoc(qrRef, {
        token: nextToken,
        updated_at: serverTimestamp(),
        previous_token: null,
      });
      return { token: nextToken };
    }

    const existingTokenRaw = snapshot.data().token;
    const existingToken =
      typeof existingTokenRaw === 'string' && existingTokenRaw.length >= 16
        ? existingTokenRaw
        : null;

    let nextToken = generateQrToken();
    while (existingToken && nextToken === existingToken) {
      nextToken = generateQrToken();
    }

    await updateDoc(qrRef, {
      token: nextToken,
      updated_at: serverTimestamp(),
      previous_token: existingToken,
    });

    return { token: nextToken };
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * Menghapus token QR aktif saat layar asisten ditinggalkan atau sesi ditutup.
 */
export async function clearSessionQrToken(
  practicumId: string,
  sessionId: string
): Promise<void> {
  try {
    await deleteDoc(getQrTokenDocRef(practicumId, sessionId));
  } catch {
    // Pengabaian aman: jika dokumen sudah terhapus, sesi sudah ditutup, atau jaringan terputus,
    // token tetap akan kedaluwarsa otomatis di Security Rules berbasis request.time.
  }
}
