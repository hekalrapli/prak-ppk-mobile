#!/usr/bin/env node
/**
 * Membuat akun Firebase Auth + profil `users/{uid}` untuk user dummy di
 * `src/data/dummy-data.tsx`. UID sengaja disamakan dengan ID dummy (P-01, A-01,
 * dst.) agar setelah login identitasnya tetap terhubung dengan data demo
 * (asisten pengampu praktikum, riwayat kehadiran, dan sebagainya).
 *
 * Akun ini HANYA untuk demo/pengembangan. Email memakai domain .test (tidak
 * bisa menerima email sungguhan).
 *
 * Prasyarat:
 *   Service account key dari project Firebase yang sama dengan aplikasi
 *   (lihat `.env` -> EXPO_PUBLIC_FIREBASE_PROJECT_ID), disimpan misalnya di
 *   `.secrets/service-account.json` (sudah di-gitignore).
 *
 * Pemakaian:
 *   node scripts/seed-dummy-users.mjs --key .secrets/service-account.json
 *   node scripts/seed-dummy-users.mjs --key .secrets/service-account.json --only P-01,A-01
 *   node scripts/seed-dummy-users.mjs --key .secrets/service-account.json \
 *     --password "SandiBaru123" --domain "dummy.prakpresensi.test"
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// Salinan dari src/data/dummy-data.tsx (jaga agar tetap sinkron).
const DUMMY_USERS = [
  { id: 'P-01', role: 'praktikan', name: 'Nabila Putri', identifier: '2211102034' },
  { id: 'P-02', role: 'praktikan', name: 'Bagas Saputra', identifier: '2211102041' },
  { id: 'P-03', role: 'praktikan', name: 'Salsabila Rahma', identifier: '2211102052' },
  { id: 'A-01', role: 'asisten', name: 'Raka Pratama', identifier: '2211101008' },
  { id: 'A-02', role: 'asisten', name: 'Dinda Maharani', identifier: '2211101015' },
  { id: 'A-03', role: 'asisten', name: 'Fajar Nugroho', identifier: '2211101022' },
  { id: 'A-04', role: 'asisten', name: 'Intan Permata', identifier: '2211101039' },
  { id: 'A-05', role: 'asisten', name: 'Bayu Setiawan', identifier: '2211101046' },
  { id: 'A-06', role: 'asisten', name: 'Citra Lestari', identifier: '2211101053' },
];

const DEFAULT_PASSWORD = 'PrakPresensi123';
const DEFAULT_DOMAIN = 'prakpresensi.test';

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
  node scripts/seed-dummy-users.mjs --key <service-account.json> [opsi]

Opsi:
  --key       Path service account key (atau set GOOGLE_APPLICATION_CREDENTIALS)
  --only      Batasi ke ID dummy tertentu, pisahkan koma (contoh: P-01,A-01)
  --password  Kata sandi semua akun (default: ${DEFAULT_PASSWORD})
  --domain    Domain email akun dummy (default: ${DEFAULT_DOMAIN})
  --help      Tampilkan bantuan ini

Contoh:
  node scripts/seed-dummy-users.mjs --key .secrets/service-account.json --only P-01,P-02,A-01
`);
}

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function emailFor(name, domain) {
  const slug = name
    .split(' ')[0]
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');
  return `${slug}@${domain}`;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
  printUsage();
  process.exit(0);
}

const password = typeof args.password === 'string' ? args.password : DEFAULT_PASSWORD;
const domain = typeof args.domain === 'string' ? args.domain.trim() : DEFAULT_DOMAIN;

if (password.length < 8) {
  fail('--password minimal 8 karakter.');
}
if (!domain) {
  fail('--domain tidak boleh kosong.');
}

let targets = DUMMY_USERS;

if (typeof args.only === 'string' && args.only.trim()) {
  const wanted = args.only
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const unknown = wanted.filter((id) => !DUMMY_USERS.some((user) => user.id === id));

  if (unknown.length > 0) {
    fail(`ID dummy tidak dikenal: ${unknown.join(', ')}. Pilihan: ${DUMMY_USERS.map((u) => u.id).join(', ')}`);
  }

  targets = DUMMY_USERS.filter((user) => wanted.includes(user.id));
}

const keySource =
  (typeof args.key === 'string' && args.key) || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keySource) {
  printUsage();
  fail('Service account key tidak ditemukan. Berikan --key <path> atau set GOOGLE_APPLICATION_CREDENTIALS.');
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
  fail('File service account tidak memuat project_id.');
}
if (appProjectId && projectId !== appProjectId) {
  fail(
    `Service account ini milik project "${projectId}", sedangkan aplikasi memakai ` +
      `"${appProjectId}" (dari .env). Unduh private key dari project Firebase yang sama.`
  );
}

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

async function findExistingEmailOwner(email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      return null;
    }
    throw error;
  }
}

async function ensureAuthUser(dummy, email) {
  try {
    const existing = await auth.getUser(dummy.id);
    if (existing.email && existing.email.toLowerCase() !== email) {
      console.warn(
        `⚠️  ${dummy.id}: email Auth (${existing.email}) berbeda dari email seed (${email}); ` +
          'password tidak diubah.'
      );
    }
    return { uid: existing.uid, created: false };
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  const emailOwner = await findExistingEmailOwner(email);
  if (emailOwner) {
    console.warn(
      `⚠️  ${dummy.id}: email ${email} sudah dipakai akun lain (UID ${emailOwner.uid}). ` +
        'Profil dibuat dengan UID tersebut, tetapi identitas demo tidak akan cocok.'
    );
    return { uid: emailOwner.uid, created: false };
  }

  const created = await auth.createUser({
    uid: dummy.id,
    email,
    password,
    displayName: dummy.name,
  });

  return { uid: created.uid, created: true };
}

console.log(`\nProject Firebase : ${projectId}`);
console.log(`Domain email     : ${domain}`);
console.log(`Kata sandi       : ${password}`);
console.log(`Jumlah akun      : ${targets.length}\n`);

const results = [];

for (const dummy of targets) {
  const email = emailFor(dummy.name, domain);

  try {
    const { uid, created } = await ensureAuthUser(dummy, email);
    const profileRef = db.collection('users').doc(uid);
    const profileSnapshot = await profileRef.get();

    await profileRef.set(
      {
        name: dummy.name,
        identifier: dummy.identifier,
        email,
        role: dummy.role,
        ...(profileSnapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true }
    );

    results.push({
      ...dummy,
      uid,
      email,
      status: created ? 'dibuat' : 'sudah ada',
    });
  } catch (error) {
    results.push({
      ...dummy,
      uid: '-',
      email,
      status: `gagal: ${error?.message ?? error}`,
    });
  }
}

console.log('ID    Peran       Nama               Email                          Status');
console.log('----  ----------  -----------------  -----------------------------  ----------');

for (const result of results) {
  console.log(
    `${result.id.padEnd(5)} ${result.role.padEnd(11)} ${result.name.padEnd(18)} ${result.email.padEnd(30)} ${result.status}`
  );
}

const failed = results.filter((result) => result.status.startsWith('gagal'));

console.log(`
${failed.length === 0 ? '✅ Selesai.' : `⚠️  ${failed.length} akun gagal dibuat.`}
Gunakan email + kata sandi di atas untuk login. Peran dikenali otomatis, dan UID
dummy (P-01/A-01/...) membuat data demo tetap terhubung.
`);
