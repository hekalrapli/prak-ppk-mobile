import { StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Judul kelompok tanggal di daftar jadwal/riwayat. */
export function SessionDateHeader({ date }: { date: string }) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  label: {
    ...Typography.label,
  },
});
