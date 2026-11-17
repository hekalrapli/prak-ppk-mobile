/**
 * Palet pastel per praktikum. Warna diturunkan secara stabil dari id praktikum
 * agar status sesi tidak pernah dibedakan hanya lewat warna.
 *
 * Pasangan surface + accent di bawah sudah diverifikasi kontras >= 4.5:1
 * untuk teks aksen di atas surface pastel (lihat pemeriksaan kontras).
 */
export interface PracticumPalette {
  surface: string;
  accent: string;
}

export const PastelPalettes: Record<'light' | 'dark', readonly PracticumPalette[]> = {
  light: [
    { surface: '#EEF0FF', accent: '#4A5BD4' },
    { surface: '#E9FFF3', accent: '#177A57' },
    { surface: '#FFFBEA', accent: '#8A6A12' },
  ],
  dark: [
    { surface: '#232437', accent: '#B9C2FF' },
    { surface: '#16281F', accent: '#8FE3BA' },
    { surface: '#2A2418', accent: '#E6C877' },
  ],
};

/** Hash deterministik sederhana; id praktikum selalu menghasilkan palet yang sama. */
export function getPracticumPalette(
  practicumId: string,
  scheme: 'light' | 'dark'
): PracticumPalette {
  const palettes = PastelPalettes[scheme];
  let hash = 0;

  for (let index = 0; index < practicumId.length; index += 1) {
    hash = (hash * 31 + practicumId.charCodeAt(index)) >>> 0;
  }

  return palettes[hash % palettes.length];
}
