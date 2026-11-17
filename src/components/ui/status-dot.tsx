import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

export type StatusTone = 'neutral' | 'muted' | 'success' | 'warning' | 'error' | 'primary';

interface StatusDotProps {
  label: string;
  tone?: StatusTone;
  style?: StyleProp<ViewStyle>;
}

/**
 * Status tanpa chip warna: satu titik kecil berwarna + teks netral.
 * Warna hanya dipakai sebagai isyarat, bukan blok latar yang menyilaukan.
 */
export function StatusDot({ label, tone = 'neutral', style }: StatusDotProps) {
  const theme = useTheme();

  const color = {
    neutral: theme.textSecondary,
    muted: theme.textTertiary,
    success: theme.success,
    warning: theme.warning,
    error: theme.error,
    primary: theme.primary,
  }[tone];

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: '100%',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, fontWeight: '600', lineHeight: 16, flexShrink: 1 },
});
