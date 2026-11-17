import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScreenHeaderProps {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}

/**
 * App bar putih dengan judul di tengah dan slot bulat di kiri/kanan.
 * Referensi: tombol bulat kiri, judul tengah, tombol bulat kanan.
 */
export function ScreenHeader({ title, left, right }: ScreenHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing.two,
          backgroundColor: theme.background,
        },
      ]}>
      <View style={styles.side}>{left}</View>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[styles.title, { color: theme.textPrimary }]}>
        {title}
      </Text>
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  side: { width: 44, alignItems: 'flex-start' },
  sideRight: { alignItems: 'flex-end' },
  title: {
    flex: 1,
    textAlign: 'center',
    ...Typography.cardTitle,
    fontWeight: '600',
  },
});
