import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

interface AttendanceRecordItemProps {
  name: string;
  meta: string;
  recordedAt: string;
  onPress?: () => void;
}

export function AttendanceRecordItem({
  name,
  meta,
  recordedAt,
  onPress,
}: AttendanceRecordItemProps) {
  const theme = useTheme();

  const content = (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text
          numberOfLines={2}
          style={[styles.name, { color: theme.textPrimary }]}>
          {name}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>{meta}</Text>
      </View>
      <View style={styles.end}>
        <View style={[styles.badge, { backgroundColor: theme.successSoft }]}>
          <Text style={[styles.badgeLabel, { color: theme.success }]}>Hadir</Text>
        </View>
        <Text style={[styles.time, { color: theme.textPrimary }]}>{recordedAt}</Text>
      </View>
    </View>
  );

  if (!onPress) {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={`${name}, ${meta}, Hadir pukul ${recordedAt}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && { backgroundColor: theme.surfacePressed },
      ]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  info: { flex: 1, minWidth: 0, gap: Spacing.half },
  name: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  meta: { fontSize: 12, lineHeight: 16 },
  end: { alignItems: 'flex-end', gap: Spacing.one },
  badge: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.xs,
  },
  badgeLabel: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  time: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
});
