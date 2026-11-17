# Setup Firebase — PrakPresensi Sprint 2

Panduan ini untuk Project Manager (satu orang membuat proyek, anggota lain diundang). Dikerjakan di Windows, tes di HP Android fisik dengan Expo Go. Memakai **Firebase JS SDK** sehingga **tidak perlu EAS build**.

## 1. Buat proyek Firebase
1. Buka https://console.firebase.google.com → **Add project** (atau **Create a project**).
2. Nama: `prakpresensi` (bebas). Google Analytics boleh dimatikan.
3. Tunggu sampai selesai → **Continue**.

## 2. Undang anggota tim
**Project settings (ikon roda gigi) → Users and permissions → Add member** → masukkan email Google anggota dengan peran **Editor**.

## 3. Daftarkan aplikasi Web (untuk mendapatkan config)
1. Halaman utama proyek → ikon **`</>` (Web)**.
2. App nickname: `prakpresensi-app`. **Tidak perlu** centang Firebase Hosting → **Register app**.
3. Salin objek `firebaseConfig` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
   Config ini bukan rahasia; keamanan data dijaga oleh Security Rules.

## 4. Aktifkan Authentication
**Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**

## 5. Buat Firestore
1. **Build → Firestore Database → Create database.**
2. Edition: Standard. Lokasi: `asia-southeast2 (Jakarta)` (lokasi tidak bisa diubah nanti).
3. Pilih **Start in production mode** (bukan test mode).

## 6. Pasang Security Rules
1. **Firestore Database → tab Rules.**
2. Tempel isi file `firestore.rules` di repo → **Publish**.
3. Uji lewat **Rules Playground** (skenario di FR-20 PRD).

## 7. Buat kode undangan asisten
Pendaftaran asisten divalidasi terhadap dokumen `config/registration`:
1. **Firestore Database → Data → Start collection** → Collection ID: `config`.
2. Document ID: `registration`.
3. Field: `asistenCode` (string) = kode rahasia pilihan tim, mis. `ASISTEN-PPK-2026`.
4. Bagikan kode hanya ke calon asisten. Dokumen ini tidak bisa dibaca aplikasi (rules `allow read: if false`), hanya dipakai rules saat mendaftar.

## 8. Konfigurasi proyek Expo
Di folder `D:\Praktikum PPK` (proyek `prak-ppk-mobile`):

```bash
npx expo install firebase @react-native-async-storage/async-storage
```

Buat `.env` (jangan di-commit) dan `.env.example` (di-commit tanpa nilai):

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Tambahkan `.env` ke `.gitignore`.

`src/services/firebase.ts`:

```ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const isNew = getApps().length === 0;
export const app = isNew ? initializeApp(firebaseConfig) : getApp();

export const auth = isNew && Platform.OS !== 'web'
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);

export const db = getFirestore(app);
```

> Catatan: di React Native, Firestore memakai cache memori; data permanen tetap ada di server dan dimuat ulang saat aplikasi dibuka. Jika jaringan sering putus, pertimbangkan `experimentalAutoDetectLongPolling: true` lewat `initializeFirestore`.

Jalankan ulang Expo dengan cache bersih agar `.env` terbaca:
```bash
npx expo start -c
```

## 9. Indeks Firestore
Tidak ada indeks collection-group yang wajib untuk fitur praktikan: izin dan riwayat memakai listener **dokumen per sesi** (`leaveRequests/{uid}`), sehingga tidak memerlukan index khusus. Jika nanti menambahkan query collection group, ikuti tautan **Create index** yang muncul di pesan error.

## 9b. Siapkan data demo (practicums & sessions)
Security Rules memeriksa `practicums/{pid}.studentIds` dan `sessions/{sid}.status`. Tanpa dokumen ini, presensi dan pengajuan izin **selalu ditolak** (`permission-denied`).

1. Unduh service account: **Project settings → Service accounts → Generate new private key**, simpan di `secrets/` (sudah di-gitignore).
2. Jalankan:

```bash
npm run seed:dummy -- --key secrets/service-account.json   # akun Auth + users/{uid}
npm run seed:demo  -- --key secrets/service-account.json   # practicums + sessions
```

`seed:demo` memasukkan semua user dengan role `praktikan` ke `studentIds` semua praktikum demo. Jalankan ulang setelah mendaftarkan akun praktikan baru.

## 10. Uji cepat
1. Daftar satu akun praktikan dan satu akun asisten (dengan kode undangan) di aplikasi, atau pakai akun dummy hasil `seed:dummy`.
2. Cek di **Authentication → Users** dan **Firestore → users** (dokumen berisi `role`).
3. Lakukan `seed:demo` agar praktikum/sesi tersedia untuk validasi Rules.
4. Gunakan dua perangkat/jendela untuk uji real-time.

## 11. Model AI
Model AI (`model-edom`) sudah terintegrasi dan berjalan **on-device** di aplikasi (pure JS) — tidak perlu server, URL, atau koneksi jaringan. Lihat README bagian *AI Leave-Reason Classification*.

## Batasan paket gratis (Spark)
Tidak ada Cloud Functions. Seluruh logika berjalan di klien + Security Rules. Kuota baca/tulis harian Firestore cukup untuk demo kelas.
