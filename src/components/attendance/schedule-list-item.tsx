import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusDot, type StatusTone } from '@/components/ui/status-dot';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getPracticumPalette } from '@/constants/pastel';
import { useThemeMode } from '@/store/theme-context';
import type { Practicum, Session, SessionStatus } from '@/types/attendance';

interface ScheduleListItemProps {
  session: Session;
  practicum: Practicum;
  assistantName?: string;
  participantCount?: number;
  onPress: () => void;
}

const STATUS_META: Record<SessionStatus, { label: string; tone: StatusTone }> = {
  upcoming: { label: 'Belum dibuka', tone: 'muted' },
  open: { label: 'Dibuka', tone: 'success' },
  closed: { label: 'Ditutup', tone: 'neutral' },
};

/**
 * Kartu sesi pastel. Warna kartu dipetakan stabil dari id praktikum;
 * status tetap ditulis sebagai teks + titik berwarna.
 */
export function ScheduleListItem({
  session,
  practicum,
  assistantName,
  participantCount,
  onPress,
}: ScheduleListItemProps) {
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const palette = getPracticumPalette(practicum.id, scheme);
  const meta = STATUS_META[session.status];
  const resolvedAssistant = assistantName ?? practicum.assistantName;

  return (
    <Pressable
      accessibilityLabel={`${practicum.name}, ${session.date}, ${session.startTime} sampai ${session.endTime}, asisten ${resolvedAssistant ?? 'tidak diketahui'}, status ${meta.label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: palette.surface, opacity: pressed ? 0.86 : 1 },
      ]}>
      <View style={styles.topRow}>
        <Text numberOfLines={2} style={[styles.title, { color: theme.textPrimary }]}>
          {practicum.name}
        </Text>
        <StatusDot
          label={meta.label}
          labelColor={palette.accent}
          tone={meta.tone}
        />
      </View>

      <Text style={[styles.time, { color: theme.textPrimary }]}>
        {session.startTime}–{session.endTime} WIB
      </Text>
      <Text numberOfLines={1} style={[styles.meta, { color: theme.textSecondary }]}>
        {practicum.className} · {session.room}
      </Text>
      {resolvedAssistant ? (
        <Text numberOfLines={1} style={[styles.meta, { color: theme.textSecondary }]}>
          Asisten: {resolvedAssistant}
        </Text>
      ) : null}

      {participantCount && participantCount > 0 ? (
        <Text style={[styles.members, { color: palette.accent }]}>
          {participantCount} peserta
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    ...Typography.cardTitle,
    flex: 1,
    minWidth: 0,
  },
  time: {
    ...Typography.label,
    marginTop: Spacing.one,
  },
  meta: { ...Typography.caption },
  members: {
    ...Typography.caption,
    fontWeight: '700',
    marginTop: Spacing.one,
  },
});
