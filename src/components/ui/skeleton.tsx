import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SkeletonListProps {
  count?: number;
}

/**
 * Placeholder kartu saat data pertama kali dimuat. Pulse opacity sederhana,
 * tanpa dependensi animasi tambahan.
 */
export function SkeletonCardList({ count = 4 }: SkeletonListProps) {
  const theme = useTheme();
  const [pulse] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityLabel="Memuat data"
      style={[styles.container, { opacity: pulse }]}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
          <View style={styles.rowBetween}>
            <View style={[styles.line, styles.lineShort, { backgroundColor: theme.surfaceSubtle }]} />
            <View style={[styles.line, styles.lineTiny, { backgroundColor: theme.surfaceSubtle }]} />
          </View>
          <View style={[styles.line, styles.lineTitle, { backgroundColor: theme.surfaceSubtle }]} />
          <View style={[styles.line, styles.lineMeta, { backgroundColor: theme.surfaceSubtle }]} />
          <View style={[styles.line, styles.lineBody, { backgroundColor: theme.surfaceSubtle }]} />
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.two,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  line: {
    height: 10,
    borderRadius: Radius.xs,
  },
  lineShort: { width: '28%' },
  lineTiny: { width: '18%' },
  lineTitle: { width: '62%', height: 14 },
  lineMeta: { width: '45%' },
  lineBody: { width: '34%' },
});
