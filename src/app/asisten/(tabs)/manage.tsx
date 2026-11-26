import { Redirect } from 'expo-router';

/**
 * FR-S4-P2-01: Manajemen praktikum & laboratorium telah dipindahkan ke peran Aslab (/aslab).
 * Layar ini mengalihkan asprak kembali ke jadwal utama (/asisten).
 */
export default function AsistenManageScreen() {
  return <Redirect href="/asisten" />;
}
