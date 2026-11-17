import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CircleButton } from './circle-button';

interface DetailHeaderProps {
  title: string;
  right?: React.ReactNode;
}

/**
 * Header koral untuk layar detail: tombol kembali bulat, judul tengah,
 * dan dekorasi lingkaran samar. Sheet putih menimpa bagian bawahnya.
 */
export function DetailHeader({ title, right }: DetailHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.primary,
          paddingTop: insets.top + Spacing.two,
        },
      ]}>
      <View pointerEvents="none" style={[styles.decorA, { borderColor: theme.onPrimary }]} />
      <View pointerEvents="none" style={[styles.decorB, { borderColor: theme.onPrimary }]} />
      <CircleButton
        accessibilityLabel="Kembali"
        onPress={() => router.back()}
        size={42}
        symbol={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
        tone="primary"
      />
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[styles.title, { color: theme.onPrimary }]}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    overflow: 'hidden',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    ...Typography.cardTitle,
  },
  right: { width: 42, alignItems: 'flex-end' },
  decorA: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 18,
    opacity: 0.1,
    top: -74,
    right: -34,
  },
  decorB: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 14,
    opacity: 0.08,
    bottom: -44,
    left: -24,
  },
});
