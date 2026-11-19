// src/lib/color.ts
/**
 * Mengubah `#RRGGBB` menjadi `rgba(...)` agar warna tema bisa dipakai untuk
 * fillColor/strokeColor react-native-maps yang membutuhkan transparansi.
 * Nilai non-hex dikembalikan apa adanya.
 */
export function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return color;

  const value = match[1];
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  const safeAlpha = Math.min(1, Math.max(0, alpha));

  return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
}
