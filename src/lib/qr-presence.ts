// src/lib/qr-presence.ts

/** Interval rotasi token QR otomatis di layar asisten (detik). */
export const QR_ROTATION_INTERVAL_SECONDS = 45;

/** Awalan payload QR resmi aplikasi PrakPresensi. */
export const QR_PAYLOAD_PREFIX = 'prakpresensi';
export const QR_PAYLOAD_VERSION = 'v1';

const TOKEN_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

export type ParsedQrPayload =
  | {
      ok: true;
      practicumId: string;
      sessionId: string;
      token: string;
    }
  | {
      ok: false;
      reason: 'invalid_format';
    };

/**
 * Menghasilkan token acak sepanjang 28 karakter (memenuhi syarat rules 16..64).
 */
export function generateQrToken(length = 28): string {
  const randomBytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let token = '';
  for (let i = 0; i < length; i += 1) {
    token += TOKEN_ALPHABET[randomBytes[i] % TOKEN_ALPHABET.length];
  }
  return token;
}

/**
 * Mengemas identitas sesi dan token ke string QR ringkas:
 * `prakpresensi:v1:<practicumId>:<sessionId>:<token>`
 */
export function encodeQrPresencePayload(params: {
  practicumId: string;
  sessionId: string;
  token: string;
}): string {
  const { practicumId, sessionId, token } = params;
  return `${QR_PAYLOAD_PREFIX}:${QR_PAYLOAD_VERSION}:${practicumId}:${sessionId}:${token}`;
}

/**
 * Mem-parse payload QR dari kamera pemindai.
 * Hanya menerima format resmi 5 segmen dengan token 16..64 karakter alfanumerik.
 */
export function parseQrPresencePayload(raw: string): ParsedQrPayload {
  const trimmed = raw.trim();
  const parts = trimmed.split(':');
  if (parts.length !== 5) {
    return { ok: false, reason: 'invalid_format' };
  }

  const [prefix, version, practicumId, sessionId, token] = parts;
  if (
    prefix !== QR_PAYLOAD_PREFIX ||
    version !== QR_PAYLOAD_VERSION ||
    !practicumId ||
    !sessionId ||
    token.length < 16 ||
    token.length > 64 ||
    !/^[A-Za-z0-9_-]+$/.test(token)
  ) {
    return { ok: false, reason: 'invalid_format' };
  }

  return {
    ok: true,
    practicumId,
    sessionId,
    token,
  };
}
