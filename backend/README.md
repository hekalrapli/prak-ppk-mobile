# PrakYuks Payment Backend (Midtrans Sandbox + Vercel)

Backend perantara untuk alur **Client ↔ Backend ↔ Midtrans Sandbox** (`FR-S4-P3-01` & `FR-S4-P3-03`).
Seluruh kredensial sensitif (`MIDTRANS_SERVER_KEY`, `MIDTRANS_SIGNATURE_SECRET_KEY`, dan `FIREBASE_SERVICE_ACCOUNT_JSON`) hanya disimpan di sini dan **tidak pernah** masuk ke aplikasi React Native.

## Endpoint
| Method & Path | Autentikasi | Fungsi |
| --- | --- | --- |
| `GET /api/health` | Publik | Cek status server & mode (`sandbox`) |
| `POST /api/payments/create-transaction` | `Bearer <Firebase ID Token>` | Validasi `fines/{fineId}`, buat transaksi Snap Sandbox, simpan `paymentTransactions/{orderId}` (`pending`), kembalikan `{ orderId, snapToken, redirectUrl }` |
| `POST /api/payments/webhook` | Midtrans `signature_key` (SHA-512) | Verifikasi signature, update atomik `paymentTransactions` & `fines` (tanpa mengubah `attendance`), kirim push notification `payment_success` / `payment_failed` |
| `GET /api/payments/status/:orderId` | `Bearer <Firebase ID Token>` | Verifikasi server-to-server ke Midtrans Status API & sinkronkan ke Firestore |

## Deploy ke Vercel (Rekomendasi)
1. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repository `prak-ppk-mobile`.
2. Atur **Root Directory** ke **`backend`**.
3. Masukkan **Environment Variables** berikut:
   - `MIDTRANS_SERVER_KEY` = `SB-Mid-server-...` (dari Midtrans Sandbox → *Settings → Access Keys → General Credentials*)
   - `MIDTRANS_SIGNATURE_SECRET_KEY` = Signature Secret Key dari halaman yang sama
   - `MIDTRANS_IS_PRODUCTION` = `false`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = isi file JSON service account Firebase project `prak-ppk-7-d45fd` (boleh 1 baris JSON mentah atau versi Base64)
4. Klik **Deploy**. Setelah selesai, tes `https://<domain-vercel-anda>/api/health`.
5. Buka **Midtrans Sandbox Dashboard → Settings → Configuration / Payment → Payment Notification URL**, lalu isi:
   ```text
   https://<domain-vercel-anda>/api/payments/webhook
   ```
6. Di root aplikasi mobile (`.env` dan `eas.json`), tambahkan:
   ```env
   EXPO_PUBLIC_PAYMENT_API_URL=https://<domain-vercel-anda>
   ```

## Menjalankan Lokal
```bash
cd backend
cp .env.example .env
# Isi MIDTRANS_SERVER_KEY, MIDTRANS_SIGNATURE_SECRET_KEY, dan FIREBASE_SERVICE_ACCOUNT_PATH
npm install
npm run dev
```
