import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PunctualityStatus } from '@/types/attendance';
import { StatusDot } from '../ui/status-dot';

interface AttendanceRecordItemProps {
  name: string;
  meta: string;
  recordedAt: string;
  punctualityStatus?: PunctualityStatus;
  lateMinutes?: number;
  onPress?: () => void;
}

export function AttendanceRecordItem({
  name,
  meta,
  recordedAt,
  punctualityStatus,
  lateMinutes,
  onPress,
}: AttendanceRecordItemProps) {
  const theme = useTheme();

  const isLate = punctualityStatus === 'late';
  const label = isLate
    ? `Terlambat (+${lateMinutes ?? 1}m)`
    : punctualityStatus === 'on_time'
      ? 'Tepat Waktu'
      : 'Hadir';
  const tone = isLate ? 'warning' : 'success';

  const content = (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text numberOfLines={2} style={[styles.name, { color: theme.textPrimary }]}>
          {name}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>{meta}</Text>
      </View>
      <View style={styles.end}>
        <StatusDot label={label} tone={tone} />
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
  name: { ...Typography.cardTitle },
  meta: { ...Typography.caption },
  end: { alignItems: 'flex-end', gap: Spacing.one },
  time: {
    ...Typography.bodyStrong,
    fontVariant: ['tabular-nums'],
  },
});
