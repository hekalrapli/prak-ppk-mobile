const lightColors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSubtle: '#F5F5F4',
  surfacePressed: '#EFEFEE',
  textPrimary: '#1A1D21',
  textSecondary: '#71767E',
  textTertiary: '#9A9FA6',
  border: '#E8E8E6',
  borderStrong: '#D4D4D1',
  // Aksi utama memakai tinta gelap, bukan biru template.
  primary: '#1A1D21',
  primaryPressed: '#000000',
  primarySoft: '#F2F2F1',
  onPrimary: '#FFFFFF',
  secondary: '#4B5058',
  success: '#4E7A5B',
  successSoft: '#F0F5F1',
  warning: '#A8823F',
  warningSoft: '#F9F4EA',
  error: '#A85252',
  errorSoft: '#F8EFEF',
  disabledBg: '#EDEDEA',
  disabledText: '#9A9FA6',
  overlay: 'rgba(26, 29, 33, 0.32)',
} as const;

const darkColors = {
  background: '#101113',
  surface: '#18191C',
  surfaceSubtle: '#202226',
  surfacePressed: '#292C31',
  textPrimary: '#ECEDEF',
  textSecondary: '#9BA1AA',
  textTertiary: '#7C828B',
  border: '#2A2C30',
  borderStrong: '#3A3D43',
  // Tombol utama dibalik menjadi putih pudar dengan teks gelap.
  primary: '#EDEEEF',
  primaryPressed: '#FFFFFF',
  primarySoft: '#24262A',
  onPrimary: '#151619',
  secondary: '#C4C8CE',
  success: '#93B8A1',
  successSoft: '#18231B',
  warning: '#C7A76A',
  warningSoft: '#2A2316',
  error: '#C98B8B',
  errorSoft: '#2B1B1B',
  disabledBg: '#232529',
  disabledText: '#7C828B',
  overlay: 'rgba(0, 0, 0, 0.6)',
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
  full: 999,
};
