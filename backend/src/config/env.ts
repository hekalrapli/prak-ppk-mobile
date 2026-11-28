import dotenv from 'dotenv';

dotenv.config();

export interface BackendEnv {
  midtransServerKey: string;
  midtransSignatureSecretKey: string;
  midtransIsProduction: boolean;
  midtransSnapBaseUrl: string;
  midtransApiBaseUrl: string;
  firebaseServiceAccountJson: string;
  firebaseServiceAccountPath: string;
  port: number;
}

export function getBackendEnv(): BackendEnv {
  const midtransServerKey = (process.env.MIDTRANS_SERVER_KEY ?? '').trim();
  const midtransSignatureSecretKey = (
    process.env.MIDTRANS_SIGNATURE_SECRET_KEY ?? ''
  ).trim();
  const midtransIsProduction =
    (process.env.MIDTRANS_IS_PRODUCTION ?? 'false').trim().toLowerCase() === 'true';

  const portRaw = Number(process.env.PORT ?? 4000);
  const port = Number.isFinite(portRaw) && portRaw > 0 ? Math.trunc(portRaw) : 4000;

  return {
    midtransServerKey,
    midtransSignatureSecretKey,
    midtransIsProduction,
    midtransSnapBaseUrl: midtransIsProduction
      ? 'https://app.midtrans.com/snap/v1'
      : 'https://app.sandbox.midtrans.com/snap/v1',
    midtransApiBaseUrl: midtransIsProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2',
    firebaseServiceAccountJson: (
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? ''
    ).trim(),
    firebaseServiceAccountPath: (
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? ''
    ).trim(),
    port,
  };
}
