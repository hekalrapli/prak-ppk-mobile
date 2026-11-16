// src/services/izinAnalyzer.ts
//
// Analisis alasan izin berbasis aturan kata kunci (rule-based NLP).
// Model-edom (sentimen review EDOM) tidak mengenali kosakata izin seperti
// "sakit", "demam", "keluarga", "mager", sehingga kategori izin ditentukan
// oleh analyzer ini. Model-edom tetap dijalankan sebagai sinyal sentimen
// sekunder di leaveClassifier.ts.
//
// Kategori (kualitas alasan izin, bukan nada review):
// - positif : alasan kuat, spesifik, dapat diverifikasi (sakit, rumah sakit,
//             keluarga meninggal, lomba/seminar resmi, bencana).
// - netral  : alasan umum/ambigu (keperluan/acara keluarga, urusan mendadak).
// - negatif : terindikasi menghindar/tidak serius (mager, malas, bolos,
//             nongkrong, main game, tidur, tidak mood).

export type IzinCategory = 'positif' | 'netral' | 'negatif';

export interface IzinAnalysis {
  category: IzinCategory;
  confidence: number;
  /** Kata/frasa kuat yang cocok (untuk audit/debug). */
  strongMatches: string[];
  /** Kata/frasa menghindar yang cocok (untuk audit/debug). */
  negativeMatches: string[];
}

// Normalisasi kata gaul/singkatan yang umum di alasan izin.
const SLANG_EXPANSIONS: Record<string, string> = {
  mager: 'malas',
  males: 'malas',
  mls: 'malas',
  mlas: 'malas',
  ogah: 'malas',
  ga: 'tidak',
  gak: 'tidak',
  gk: 'tidak',
  nggak: 'tidak',
  enggak: 'tidak',
  tdk: 'tidak',
  gpp: 'tidak apa apa',
  gapapa: 'tidak apa apa',
  dateng: 'datang',
  skit: 'sakit',
  skt: 'sakit',
  sakitt: 'sakit',
  rmh: 'rumah',
  rs: 'rumah sakit',
  ortu: 'orang tua',
  nyokap: 'orang tua',
  bokap: 'orang tua',
  kluarga: 'keluarga',
  kelg: 'keluarga',
  klg: 'keluarga',
  acr: 'acara',
  krn: 'karena',
  karna: 'karena',
  dgn: 'dengan',
  yg: 'yang',
  utk: 'untuk',
  udh: 'sudah',
  udah: 'sudah',
  sdh: 'sudah',
  jg: 'juga',
  aja: 'saja',
  bgt: 'banget',
  mabar: 'main game',
  nongkrong: 'nongkrong',
  kopdar: 'nongkrong',
  ngopi: 'nongkrong',
  healing: 'liburan',
  jalan2: 'jalan jalan',
  turing: 'jalan jalan',
  gamed: 'main game',
  gaming: 'main game',
};

// Frasa alasan kuat (spesifik & dapat diverifikasi).
const STRONG_PHRASES = [
  // Kesehatan
  'sakit',
  'demam',
  'panas',
  'flu',
  'batuk',
  'pilek',
  'pusing',
  'mual',
  'muntah',
  'diare',
  'tipus',
  'tipes',
  'dbd',
  'demam berdarah',
  'rumah sakit',
  'rawat inap',
  'opname',
  'operasi',
  'dokter',
  'klinik',
  'puskesmas',
  'kecelakaan',
  'patah',
  'luka',
  'hamil',
  'melahirkan',
  'keguguran',
  'covid',
  'isolasi',
  'karantina',
  'vaksin',
  'infus',
  'rawat',
  // Keluarga & keadaan darurat
  'meninggal',
  'wafat',
  'duka',
  'pemakaman',
  'jenazah',
  'menjenguk',
  'mendampingi',
  'rumah duka',
  'banjir',
  'kebakaran',
  'gempa',
  'bencana',
  'evakuasi',
  'musibah',
  // Akademik/resmi
  'lomba',
  'kompetisi',
  'olimpiade',
  'seminar',
  'konferensi',
  'workshop',
  'dinas',
  'tugas kampus',
  'mewakili kampus',
  'delegasi',
  'sidang',
  'yudisium',
  'ujian susulan',
  'kegiatan wajib kampus',
] as const;

// Frasa terindikasi menghindar / tidak serius.
const NEGATIVE_PHRASES = [
  'malas',
  'bolos',
  'nongkrong',
  'main game',
  'game',
  'mabar',
  'tidur',
  'ketiduran',
  'kesiangan',
  'telat bangun',
  'tidak mood',
  'mood',
  'skip',
  'nanti saja',
  'tidak niat',
  'lelah',
  'capek',
  'kantuk',
  'ngantuk',
  'bosan',
  'jenuh',
  'jalan jalan',
  'liburan',
  'nonton',
  'bioskop',
  'konser',
  'kencan',
  'pacar',
  'gebetan',
] as const;

// Frasa netral/umum (hanya menaikkan keyakinan kategori netral).
const NEUTRAL_PHRASES = [
  'keperluan',
  'urusan',
  'kegiatan',
  'acara',
  'kepentingan',
  'pribadi',
  'keluarga',
  'mendadak',
  'izin',
  'tanggungan',
] as const;

function normalizeText(text: string): string {
  const words = text
    .toLowerCase()
    // buang tanda baca & karakter non-alfanumerik
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    // rapikan huruf berulang berlebihan (mis. "sakittt" -> "sakit")
    .map((word) => word.replace(/([a-z])\1{2,}/g, '$1'))
    .map((word) => SLANG_EXPANSIONS[word] ?? word)
    .join(' ');

  // ganti frasa multi-kata hasil ekspansi (mis. "rs" -> "rumah sakit")
  return ` ${words.replace(/\s+/g, ' ').trim()} `;
}

function countMatches(paddedText: string, phrases: readonly string[]): string[] {
  const matches: string[] = [];
  const seen = new Set<string>();

  for (const phrase of phrases) {
    if (paddedText.includes(` ${phrase} `) && !seen.has(phrase)) {
      seen.add(phrase);
      matches.push(phrase);
    }
  }

  return matches;
}

function clampConfidence(value: number): number {
  return Math.min(0.95, Math.max(0.4, Math.round(value * 100) / 100));
}

/**
 * Menganalisis alasan izin menjadi kategori positif/netral/negatif.
 * Deterministik: alasan yang sama selalu menghasilkan kategori yang sama.
 *
 * Aturan keputusan:
 * - Ada kata kuat tanpa kata menghindar  -> positif
 * - Ada kata menghindar tanpa kata kuat  -> negatif
 * - Keduanya muncul (campuran)           -> netral
 * - Tidak ada yang cocok                 -> netral (ambigu)
 */
export function analyzeIzinReason(reason: string): IzinAnalysis {
  const text = normalizeText(reason);

  const strongMatches = countMatches(text, STRONG_PHRASES);
  const negativeMatches = countMatches(text, NEGATIVE_PHRASES);
  const neutralMatches = countMatches(text, NEUTRAL_PHRASES);

  if (strongMatches.length > 0 && negativeMatches.length === 0) {
    return {
      category: 'positif',
      confidence: clampConfidence(0.7 + 0.05 * (strongMatches.length - 1)),
      strongMatches,
      negativeMatches,
    };
  }

  if (negativeMatches.length > 0 && strongMatches.length === 0) {
    return {
      category: 'negatif',
      confidence: clampConfidence(0.72 + 0.05 * (negativeMatches.length - 1)),
      strongMatches,
      negativeMatches,
    };
  }

  if (strongMatches.length > 0 && negativeMatches.length > 0) {
    // Alasan campuran (mis. menyebut sakit tetapi juga mager) -> ambigu.
    return { category: 'netral', confidence: 0.5, strongMatches, negativeMatches };
  }

  return {
    category: 'netral',
    confidence: neutralMatches.length > 0 ? 0.55 : 0.45,
    strongMatches,
    negativeMatches,
  };
}
