// src/lib/format-distance.ts
/**
 * Format jarak untuk UI: "18 m" di bawah 1 km, "1,2 km" di atasnya.
 * Angka desimal memakai koma agar konsisten dengan format Indonesia.
 */
export function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) {
    return '—';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const kilometers = (meters / 1000).toFixed(1).replace('.', ',');
  return `${kilometers} km`;
}
