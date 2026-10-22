import { Platform } from 'react-native';

const lightColors = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F3F6',
  surfacePressed: '#E8ECF1',
  textPrimary: '#111827',
  textSecondary: '#5B6472',
  textTertiary: '#6B7480',
  border: '#DDE2E8',
  borderStrong: '#C6CDD6',
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primarySoft: '#EAF1FF',
  onPrimary: '#FFFFFF',
  secondary: '#475569',
  success: '#15803D',
  successSoft: '#E8F6EC',
  warning: '#9A4A08',
  warningSoft: '#FFF3E3',
  error: '#B91C1C',
  errorSoft: '#FDECEC',
  disabledBg: '#E5E7EB',
  disabledText: '#7A8492',
  focusRing: '#93B4F8',
} as const;

const darkColors = {
  background: '#0E1116',
  surface: '#171B21',
  surfaceSubtle: '#21262E',
  surfacePressed: '#2A3039',
  textPrimary: '#F3F5F8',
  textSecondary: '#A7B0BD',
  textTertiary: '#9099A6',
  border: '#2A303A',
  borderStrong: '#3B4450',
  primary: '#7AA6FF',
  primaryPressed: '#5F91F2',
  primarySoft: '#182744',
  onPrimary: '#08111F',
  secondary: '#CBD5E1',
  success: '#6DDB95',
  successSoft: '#122C1D',
  warning: '#F0B36A',
  warningSoft: '#332612',
  error: '#FF9A9A',
  errorSoft: '#361A1A',
  disabledBg: '#252A32',
  disabledText: '#7F8895',
  focusRing: '#4C7FE0',
} as const;

/**
 * `text`, `backgroundElement`, and `backgroundSelected` are kept as aliases
 * for the remaining Expo starter components. New screens should use the
 * semantic tokens (`textPrimary`, `surfaceSubtle`, ...).
 */
export const Colors = {
  light: {
    ...lightColors,
    text: lightColors.textPrimary,
    backgroundElement: lightColors.surfaceSubtle,
    backgroundSelected: lightColors.surfacePressed,
  },
  dark: {
    ...darkColors,
    text: darkColors.textPrimary,
    backgroundElement: darkColors.surfaceSubtle,
    backgroundSelected: darkColors.surfacePressed,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 560;
