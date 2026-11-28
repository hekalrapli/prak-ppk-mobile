import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ScheduleRow, ScheduleTimeSlot } from '@/lib/schedule-organizer';
import type { Practicum, Session } from '@/types/attendance';
import { ScheduleListItem } from './schedule-list-item';

interface ScheduleTimelineItemProps {
  slot: ScheduleTimeSlot;
  isNow: boolean;
  showDate?: boolean;
  getAssistantName?: (row: ScheduleRow) => string | undefined;
  onPressSession: (practicum: Practicum, session: Session) => void;
}

/**
 * Satu blok rentang jam pada timeline jadwal:
 * - Kiri: jam mulai (dan jam selesai bila seluruh sesi di slot berbagi rentang yang sama).
 * - Tengah: garis vertikal timeline + titik "sekarang" bila sedang berlangsung.
 * - Kanan: seluruh kartu sesi praktikum yang berlaku pada rentang jam tersebut.
 */
export function ScheduleTimelineItem({
  slot,
  isNow,
  showDate = false,
  getAssistantName,
  onPressSession,
}: ScheduleTimelineItemProps) {
  const theme = useTheme();
  const hasSharedRange = slot.endTime !== null;

  return (
    <View style={styles.row}>
      <View style={styles.timeColumn}>
        <Text style={[styles.startTime, { color: theme.textPrimary }]}>
          {slot.startTime}
        </Text>
        {slot.endTime ? (
          <Text style={[styles.endTime, { color: theme.textTertiary }]}>
            {slot.endTime}
          </Text>
        ) : null}
      </View>

      <View style={styles.rail}>
        <View style={[styles.line, { backgroundColor: theme.borderStrong }]} />
        {isNow ? (
          <View
            accessibilityLabel="Sesi sedang berlangsung"
            style={[styles.halo, { backgroundColor: theme.accentSoft }]}>
            <View style={[styles.nowDot, { backgroundColor: theme.accent }]} />
          </View>
        ) : (
          <View
            style={[
              styles.slotDot,
              {
                backgroundColor: theme.background,
                borderColor: theme.borderStrong,
              },
            ]}
          />
        )}
      </View>

      <View style={styles.cardColumn}>
        {slot.rows.map((item) => (
          <ScheduleListItem
            key={`${item.practicum.id}-${item.session.id}`}
            assistantName={getAssistantName?.(item)}
            hideTime={hasSharedRange}
            onPress={() => onPressSession(item.practicum, item.session)}
            practicum={item.practicum}
            session={item.session}
            showDate={showDate}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  timeColumn: {
    width: 48,
    paddingTop: Spacing.three,
    gap: 2,
  },
  startTime: {
    ...Typography.caption,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  endTime: {
    ...Typography.caption,
    fontSize: 12,
    lineHeight: 16,
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
  slotDot: {
    position: 'absolute',
    top: Spacing.three + 5,
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    borderWidth: 2,
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
  cardColumn: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
});
