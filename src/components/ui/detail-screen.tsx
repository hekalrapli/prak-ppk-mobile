import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { DetailHeader } from './detail-header';

/**
 * Kerangka layar detail: header koral + area konten. Sheet putih milik
 * layar (SessionDetail/AttendanceRecap) menimpa bagian bawah header.
 */
export function DetailScreen({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <DetailHeader title={title} />
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1 },
});
