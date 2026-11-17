#!/usr/bin/env node
/**
 * Membuat akun PrakPresensi (Firebase Auth + dokumen `users/{uid}`) lewat
 * Firebase Admin SDK. Jalankan di komputer, bukan di dalam aplikasi.
 *
 * Prasyarat:
 *   1. npm install
 *   2. Unduh service account key:
 *      Firebase Console -> Project settings -> Service accounts
 *      -> Generate new private key -> simpan, MISALNYA, di:
 *      .secrets/service-account.json  (folder ini sudah di-gitignore)
 *
 * Pemakaian (akun baru):
 *   node scripts/create-user.mjs --key .secrets/service-account.json \
 *     --email asisten@contoh.com --password Rahasia123 \
 *     --name "Nama Asisten" --identifier 2211101008 --role asisten
 *
 * Melengkapi profil untuk akun Auth yang sudah ada (mis. dibuat manual):
 *   node scripts/create-user.mjs --key .secrets/service-account.json \
 *     --uid <UID> --email asisten@contoh.com \
 *     --name "Nama Asisten" --identifier 2211101008 --role asisten
 *
 * Catatan:
 *   - Admin SDK melewati Firestore Security Rules, jadi kode undangan asisten
 *     TIDAK diperlukan di sini. Registrasi lewat aplikasi tetap mewajibkannya.
 *   - Jangan commit service account key.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split('=');
    if (inlineValue !== undefined) {
      result[rawKey] = inlineValue;
    } else if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
      result[rawKey] = argv[index + 1];
      index += 1;
    } else {
      result[rawKey] = true;
    }
  }

  return result;
}

function printUsage() {
  console.log(`
Pemakaian:
  node scripts/create-user.mjs --key <service-account.json> \\
    --email <email> --password <min 8 karakter> \\
    --name <nama lengkap> --identifier <NIM/NIP 8-20 digit> \\
    --role <praktikan|asisten>

Opsi:
  --key        Path service account key (atau set GOOGLE_APPLICATION_CREDENTIALS)
  --uid        Lampirkan profil ke akun Auth yang sudah ada (password tidak perlu)
  --email      Email akun
  --password   Kata sandi (wajib jika membuat akun baru)
  --name       Nama lengkap (maks 60 karakter)
  --identifier NIM/NIP, 8-20 digit angka
  --role       praktikan (default) atau asisten
  --help       Tampilkan bantuan ini
`);
}

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exitCode = 1;
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const name = typeof args.name === 'string' ? args.name.trim() : '';
const identifier = typeof args.identifier === 'string' ? args.identifier.trim() : '';
const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
const password = typeof args.password === 'string' ? args.password : '';
const role = typeof args.role === 'string' ? args.role : 'praktikan';
const uid = typeof args.uid === 'string' ? args.uid.trim() : '';

if (!name) {
  fail('--name wajib diisi.');
}
if (name.length > 60) {
  fail('--name maksimal 60 karakter.');
}
if (!/^\d{8,20}$/.test(identifier)) {
  fail('--identifier harus 8-20 digit angka (NIM/NIP).');
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail('--email tidak valid.');
}
if (role !== 'praktikan' && role !== 'asisten') {
  fail('--role harus "praktikan" atau "asisten".');
}
if (!uid && password.length < 8) {
  fail('--password minimal 8 karakter (wajib saat membuat akun baru).');
}

const keySource =
  (typeof args.key === 'string' && args.key) || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keySource) {
  printUsage();
  fail(
    'Service account key tidak ditemukan. Berikan --key <path> atau set GOOGLE_APPLICATION_CREDENTIALS.'
  );
}

const keyPath = resolve(keySource);

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
} catch {
  fail(`Gagal membaca service account key di ${keyPath}.`);
}

function readAppProjectId() {
  try {
    const envText = readFileSync(resolve('.env'), 'utf8');
    const match = envText.match(/^EXPO_PUBLIC_FIREBASE_PROJECT_ID=(.*)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

const projectId = serviceAccount.project_id;
const appProjectId = readAppProjectId();

if (!projectId) {
  fail('File service account tidak memuat project_id. Pastikan file yang diunduh benar.');
}

if (appProjectId && projectId !== appProjectId) {
  fail(
    `Service account ini milik project "${projectId}", sedangkan aplikasi memakai ` +
      `"${appProjectId}" (dari .env). Unduh private key dari project Firebase yang sama ` +
      'agar akun muncul di project yang dipakai aplikasi.'
  );
}

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

try {
  let targetUid = uid;

  if (!targetUid) {
    try {
      const user = await auth.createUser({
        email,
        password,
        displayName: name,
      });
      targetUid = user.uid;
    } catch (error) {
      if (error?.code === 'auth/email-already-exists') {
        const existing = await auth.getUserByEmail(email);
        fail(
          `Email ${email} sudah terdaftar dengan UID ${existing.uid}. ` +
            `Jalankan ulang dengan --uid ${existing.uid} untuk melengkapi profilnya.`
        );
      }
      throw error;
    }
  } else {
    const existing = await auth.getUser(targetUid);
    if (existing.email && existing.email.toLowerCase() !== email) {
      console.warn(
        `⚠️  Email Auth (${existing.email}) berbeda dengan --email (${email}). ` +
          'Profil akan memakai nilai --email.'
      );
    }
  }

  const profileRef = db.collection('users').doc(targetUid);
  const profileSnapshot = await profileRef.get();

  await profileRef.set(
    {
      name,
      identifier,
      email,
      role,
      ...(profileSnapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true }
  );

  console.log(`
✅ Akun siap digunakan
   Project    : ${projectId}
   UID        : ${targetUid}
   Nama       : ${name}
   NIM/NIP    : ${identifier}
   Email      : ${email}
   Peran      : ${role}
   Profil     : users/${targetUid}${profileSnapshot.exists ? ' (diperbarui)' : ' (dibuat)'}

Masuk ke aplikasi dengan email dan kata sandi tersebut. Peran akan dikenali
otomatis; tidak perlu memilih praktikan/asisten saat login.
`);
} catch (error) {
  console.error('\n❌ Gagal membuat akun:', error?.message ?? error);
  process.exitCode = 1;
}
