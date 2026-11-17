import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Practicum, Session } from '@/types/attendance';
import { ScheduleListItem } from './schedule-list-item';

interface ScheduleTimelineItemProps {
  session: Session;
  practicum: Practicum;
  participantCount?: number;
  isNow: boolean;
  onPress: () => void;
}

/**
 * Baris timeline: jam di kiri, garis tipis, kartu pastel di kanan.
 * Titik "sekarang" murni visual; tidak mengubah status sesi.
 */
export function ScheduleTimelineItem({
  session,
  practicum,
  participantCount,
  isNow,
  onPress,
}: ScheduleTimelineItemProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.timeColumn}>
        <Text style={[styles.time, { color: theme.textSecondary }]}>
          {session.startTime}
        </Text>
      </View>

      <View style={styles.rail}>
        <View style={[styles.line, { backgroundColor: theme.borderStrong }]} />
        {isNow ? (
          <View
            accessibilityLabel="Sesi sedang berlangsung"
            style={[styles.halo, { backgroundColor: theme.accentSoft }]}>
            <View style={[styles.nowDot, { backgroundColor: theme.accent }]} />
          </View>
        ) : null}
      </View>

      <View style={styles.cardColumn}>
        <ScheduleListItem
          onPress={onPress}
          participantCount={participantCount}
          practicum={practicum}
          session={session}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  timeColumn: { width: 48, paddingTop: Spacing.three },
  time: {
    ...Typography.caption,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rail: {
    width: 20,
    alignItems: 'center',
    marginRight: Spacing.two,
  },
  line: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  halo: {
    position: 'absolute',
    top: Spacing.three,
    width: 18,
    height: 18,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowDot: { width: 8, height: 8, borderRadius: Radius.full },
  cardColumn: { flex: 1, minWidth: 0, paddingBottom: Spacing.three },
});
