#!/usr/bin/env node
/**
 * Menyiapkan dokumen `practicums/{pid}` dan `sessions/{sid}` di Firestore.
 *
 * Kenapa perlu: Security Rules memeriksa `isPeserta(pid)` (uid praktikan ada di
 * `studentIds`) dan `session(pid, sid).data.status`. Tanpa dokumen ini, Firestore
 * menolak semua penulisan presensi/izin dari aplikasi dengan `permission-denied`.
 *
 * Sejak FR-13, daftar praktikum asisten diambil dari Firestore dengan
 * `where('assistantId','==',uid)`. Script ini memasangkan setiap praktikum ke
 * akun asisten yang benar-benar terdaftar (round-robin) sehingga asisten hanya
 * melihat praktikum yang diampu olehnya.
 *
 * Semua user dengan role `praktikan` di koleksi `users` dimasukkan ke
 * `studentIds`, sehingga akun yang didaftarkan lewat aplikasi ikut dikenali.
 *
 * Prasyarat: service account key dari project Firebase yang sama dengan `.env`,
 * serta minimal satu akun asisten dan satu akun praktikan di koleksi `users`.
 *
 * Pemakaian:
 *   node scripts/seed-demo-firestore.mjs --key secrets/service-account.json
 *   npm run seed:demo -- --key secrets/service-account.json
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Data jadwal demo. assistantId diisi dinamis dari akun asisten terdaftar.
const DUMMY_PRACTICUMS = [
  { id: 'PRK-1', name: 'Praktikum Pemrograman Mobile', className: 'IF-3A' },
  { id: 'PRK-2', name: 'Praktikum Basis Data', className: 'IF-3A' },
  { id: 'PRK-3', name: 'Praktikum Jaringan Komputer', className: 'IF-3A' },
  { id: 'PRK-4', name: 'Praktikum Struktur Data', className: 'IF-3A' },
  { id: 'PRK-5', name: 'Praktikum Sistem Operasi', className: 'IF-3A' },
  { id: 'PRK-6', name: 'Praktikum Kecerdasan Buatan', className: 'IF-3A' },
  { id: 'PRK-7', name: 'Praktikum Rekayasa Perangkat Lunak', className: 'IF-3A' },
  { id: 'PRK-8', name: 'Praktikum Keamanan Informasi', className: 'IF-3A' },
  { id: 'PRK-9', name: 'Praktikum Pemrograman Web', className: 'IF-3A' },
  { id: 'PRK-10', name: 'Praktikum Analisis dan Perancangan Sistem', className: 'IF-3A' },
];

const DUMMY_SESSIONS = [
  { id: 'S-01', practicumId: 'PRK-1', date: 'Senin, 26 Okt 2026', startTime: '08:00', endTime: '09:40', room: 'Lab Mobile 2', status: 'upcoming' },
  { id: 'S-02', practicumId: 'PRK-2', date: 'Selasa, 27 Okt 2026', startTime: '10:00', endTime: '11:40', room: 'Lab Basis Data 1', status: 'open' },
  { id: 'S-03', practicumId: 'PRK-3', date: 'Senin, 19 Okt 2026', startTime: '13:00', endTime: '14:40', room: 'Lab Jaringan', status: 'closed' },
  { id: 'S-04', practicumId: 'PRK-4', date: 'Rabu, 28 Okt 2026', startTime: '15:00', endTime: '16:40', room: 'Lab Komputer 3', status: 'upcoming' },
  { id: 'S-05', practicumId: 'PRK-5', date: 'Kamis, 29 Okt 2026', startTime: '08:00', endTime: '09:40', room: 'Lab Sistem Operasi', status: 'upcoming' },
  { id: 'S-06', practicumId: 'PRK-6', date: 'Kamis, 29 Okt 2026', startTime: '10:00', endTime: '11:40', room: 'Lab Kecerdasan Buatan', status: 'open' },
  { id: 'S-07', practicumId: 'PRK-7', date: 'Jumat, 30 Okt 2026', startTime: '13:00', endTime: '14:40', room: 'Lab RPL', status: 'upcoming' },
  { id: 'S-08', practicumId: 'PRK-8', date: 'Jumat, 30 Okt 2026', startTime: '15:00', endTime: '16:40', room: 'Lab Keamanan', status: 'closed' },
  { id: 'S-09', practicumId: 'PRK-9', date: 'Selasa, 20 Okt 2026', startTime: '08:00', endTime: '09:40', room: 'Lab Web', status: 'open' },
  { id: 'S-10', practicumId: 'PRK-10', date: 'Selasa, 20 Okt 2026', startTime: '10:00', endTime: '11:40', room: 'Lab APSI', status: 'open' },
];

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
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
  node scripts/seed-demo-firestore.mjs --key <service-account.json>

Opsi:
  --key   Path service account key (atau set GOOGLE_APPLICATION_CREDENTIALS)
  --help  Tampilkan bantuan ini

Contoh:
  node scripts/seed-demo-firestore.mjs --key secrets/service-account.json
`);
}

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
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

const args = parseArgs(process.argv.slice(2));

if (args.help || args.h) {
  printUsage();
  process.exit(0);
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

const db = getFirestore();

async function main() {
  console.log(`\nProject Firebase : ${projectId}`);

  const usersSnapshot = await db.collection('users').get();
  const users = usersSnapshot.docs.map((docSnap) => ({
    uid: docSnap.id,
    ...docSnap.data(),
  }));

  const praktikanIds = users
    .filter((user) => user.role === 'praktikan')
    .map((user) => user.uid);

  const asistenList = users
    .filter((user) => user.role === 'asisten')
    .map((user) => ({ uid: user.uid, name: user.name || 'Asisten' }));

  if (praktikanIds.length === 0) {
    fail(
      'Tidak ada user dengan role "praktikan". Daftarkan minimal satu akun praktikan di aplikasi.'
    );
  }

  if (asistenList.length === 0) {
    fail(
      'Tidak ada user dengan role "asisten". Daftarkan minimal satu akun asisten ' +
        '(butuh kode undangan) atau jalankan npm run seed:dummy terlebih dahulu.'
    );
  }

  console.log(`Praktikan        : ${praktikanIds.join(', ')}`);
  console.log(
    `Asisten pengampu : ${asistenList.map((asisten) => `${asisten.name} (${asisten.uid})`).join(', ')}`
  );
  console.log(`Praktikum        : ${DUMMY_PRACTICUMS.length}`);
  console.log(`Sesi             : ${DUMMY_SESSIONS.length}\n`);

  const batch = db.batch();

  DUMMY_PRACTICUMS.forEach((practicum, index) => {
    const assistant = asistenList[index % asistenList.length];

    batch.set(
      db.collection('practicums').doc(practicum.id),
      {
        name: practicum.name,
        className: practicum.className,
        assistantId: assistant.uid,
        assistantName: assistant.name,
        studentIds: praktikanIds,
      },
      { merge: true }
    );
  });

  for (const session of DUMMY_SESSIONS) {
    batch.set(
      db.collection('practicums').doc(session.practicumId).collection('sessions').doc(session.id),
      {
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        room: session.room,
        status: session.status,
        ...(session.status === 'open' ? { openedAt: session.startTime } : {}),
        ...(session.status === 'closed' ? { openedAt: session.startTime, closedAt: session.endTime } : {}),
      },
      { merge: true }
    );
  }

  await batch.commit();

  console.log('✅ Selesai. Dokumen practicums/sessions siap dipakai aplikasi.');
  console.log('   Setiap praktikum dipasangkan ke asisten terdaftar secara round-robin,');
  console.log('   sehingga asisten hanya melihat praktikum yang ia ampu.');
  console.log('   Semua akun praktikan di koleksi users menjadi peserta semua praktikum demo.');
  console.log('   Jalankan ulang script ini setelah mendaftarkan akun baru.\n');
}

main().catch((error) => {
  console.error('\n❌ Gagal menyiapkan data demo:', error?.message ?? error);
  process.exit(1);
});
