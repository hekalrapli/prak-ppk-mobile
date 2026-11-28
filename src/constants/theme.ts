const lightColors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  // Latar hangat untuk shell auth dan area dekoratif, bukan pengganti putih layar.
  surfaceWarm: '#FFF8F2',
  surfaceSubtle: '#FFF4EC',
  surfacePressed: '#FFEADF',
  textPrimary: '#241C18',
  textSecondary: '#6B5F59',
  textTertiary: '#8A7E78',
  border: '#F0E5DE',
  borderStrong: '#DCCBC1',
  // Aksi utama memakai koral gelap agar teks putih tetap lolos WCAG AA (4.7:1).
  primary: '#C9492B',
  primaryPressed: '#B03E24',
  primarySoft: '#FFE9D6',
  onPrimary: '#FFFFFF',
  // Permukaan koral terang (kartu sorotan, bottom nav). Teks memakai onAccent.
  accent: '#FF8A68',
  accentPressed: '#F27452',
  accentSoft: '#FFE9D6',
  onAccent: '#2A1A14',
  secondary: '#5B4C45',
  // Warna teks tautan di atas latar terang/gelap mengikuti kontras yang aman.
  link: '#C9492B',
  success: '#177A57',
  successSoft: '#E8F7EF',
  warning: '#8A6A12',
  warningSoft: '#FFF7DF',
  error: '#A63A34',
  errorSoft: '#FDECEC',
  // Merah tegas khusus tombol aksi destruktif (Keluar akun / Hapus) — rasio kontras 4.8:1 dg putih.
  destructive: '#DC2626',
  destructivePressed: '#B91C1C',
  onDestructive: '#FFFFFF',
  disabledBg: '#F2EAE4',
  disabledText: '#9C8F88',
  focusRing: '#E08A6E',
  overlay: 'rgba(36, 28, 24, 0.36)',
} as const;

const darkColors = {
  background: '#141110',
  surface: '#1D1917',
  surfaceWarm: '#181412',
  surfaceSubtle: '#2A2320',
  surfacePressed: '#332A26',
  textPrimary: '#F5EEE9',
  textSecondary: '#C3B6AE',
  textTertiary: '#A1938B',
  border: '#332B27',
  borderStrong: '#4A3E38',
  // Di mode gelap permukaan koral digelapkan agar teks terang tetap lolos AA.
  primary: '#C9492B',
  primaryPressed: '#B03E24',
  primarySoft: '#3A2018',
  onPrimary: '#FFFFFF',
  accent: '#C9492B',
  accentPressed: '#B03E24',
  accentSoft: '#3A2018',
  onAccent: '#FFFFFF',
  secondary: '#C3B6AE',
  link: '#FF8A68',
  success: '#7ED3A6',
  successSoft: '#12231B',
  warning: '#E3C06A',
  warningSoft: '#2A2316',
  error: '#F0918C',
  errorSoft: '#2B1514',
  // Merah solid tegas di mode gelap agar tombol Keluar/Hapus tidak tampak pink pucat.
  destructive: '#DC2626',
  destructivePressed: '#B91C1C',
  onDestructive: '#FFFFFF',
  disabledBg: '#2A2320',
  disabledText: '#8E8078',
  focusRing: '#FF9F7F',
  overlay: 'rgba(0, 0, 0, 0.62)',
} as const;

export const Colors = {
  light: lightColors,
  dark: darkColors,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
};

export const Radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  /** Kartu jadwal, kartu sorotan, dan kartu sesi. */
  card: 20,
  /** Sudut atas bottom sheet detail sesi. */
  sheet: 28,
  pill: 999,
  full: 999,
};

export const Typography = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: '700' },
  screenTitle: { fontSize: 26, lineHeight: 34, fontWeight: '700' },
  sectionTitle: { fontSize: 19, lineHeight: 27, fontWeight: '600' },
  cardTitle: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  button: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
} as const;

/**
 * Bayangan hangat. iOS memakai shadow*, Android memakai elevation sehingga
 * warna bayangan Android mengikuti sistem (netral), bukan shadowColor.
 * Jangan menambahkan bayangan di luar tiga token ini.
 */
export const Shadow = {
  soft: {
    shadowColor: '#B08968',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  floating: {
    shadowColor: '#C25A3A',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  sheet: {
    shadowColor: '#B08968',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 10,
  },
};
