import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import { getBackendEnv } from '../config/env';

function parseServiceAccountFromEnv(): ServiceAccount {
  const env = getBackendEnv();

  if (env.firebaseServiceAccountJson) {
    const raw = env.firebaseServiceAccountJson;
    let parsedText = raw;

    // Mendukung JSON mentah maupun JSON yang di-encode Base64 (praktis di Vercel Env Vars).
    if (!raw.startsWith('{')) {
      try {
        parsedText = Buffer.from(raw, 'base64').toString('utf8');
      } catch {
        // Biarkan JSON.parse melaporkan error yang jelas di bawah.
      }
    }

    const parsed = JSON.parse(parsedText) as Record<string, unknown>;
    if (typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed as unknown as ServiceAccount;
  }

  if (env.firebaseServiceAccountPath) {
    const filePath = resolve(env.firebaseServiceAccountPath);
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Record<
      string,
      unknown
    >;
    if (typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed as unknown as ServiceAccount;
  }

  throw new Error(
    'Kredensial Firebase Admin belum dikonfigurasi. Isi FIREBASE_SERVICE_ACCOUNT_JSON atau FIREBASE_SERVICE_ACCOUNT_PATH.'
  );
}

let cachedApp: App | null = null;

export function getFirebaseAdminApp(): App {
  if (cachedApp) {
    return cachedApp;
  }

  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }

  const serviceAccount = parseServiceAccountFromEnv();
  cachedApp = initializeApp({
    credential: cert(serviceAccount),
  });
  return cachedApp;
}

export function getAdminDb(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}
