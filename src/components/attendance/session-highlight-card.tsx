import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusDot, type StatusTone } from '@/components/ui/status-dot';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Practicum, Session, SessionStatus } from '@/types/attendance';

interface SessionHighlightCardProps {
  practicum: Practicum;
  session: Session;
  participantCount?: number;
  onPress: () => void;
}

const STATUS_META: Record<SessionStatus, { label: string; tone: StatusTone }> = {
  upcoming: { label: 'Belum dibuka', tone: 'muted' },
  open: { label: 'Dibuka', tone: 'success' },
  closed: { label: 'Ditutup', tone: 'neutral' },
};

/**
 * Kartu sorotan koral: sesi yang sedang dibuka, atau sesi berikutnya.
 * Tidak menampilkan foto pengajar; nama asisten hanya teks yang memang
 * tersedia di data.
 */
export function SessionHighlightCard({
  practicum,
  session,
  participantCount,
  onPress,
}: SessionHighlightCardProps) {
  const theme = useTheme();
  const meta = STATUS_META[session.status];
  const eyebrow = session.status === 'open' ? 'Sesi berlangsung' : 'Sesi berikutnya';

  return (
    <Pressable
      accessibilityLabel={`${practicum.name}, ${session.date}, ${session.startTime} sampai ${session.endTime}, status ${meta.label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        Shadow.floating,
        { backgroundColor: theme.accent, opacity: pressed ? 0.92 : 1 },
      ]}>
      <View style={styles.topRow}>
        <Text style={[styles.eyebrow, { color: theme.onAccent }]}>{eyebrow}</Text>
        <StatusDot
          label={meta.label}
          labelColor={theme.onAccent}
          tone={meta.tone}
        />
      </View>

      <Text numberOfLines={2} style={[styles.title, { color: theme.onAccent }]}>
        {practicum.name}
      </Text>
      <Text style={[styles.meta, { color: theme.onAccent }]}>
        {session.date}
      </Text>
      <Text style={[styles.time, { color: theme.onAccent }]}>
        {session.startTime}–{session.endTime} WIB
      </Text>

      <View style={styles.footerRow}>
        <Text numberOfLines={1} style={[styles.meta, styles.footerText, { color: theme.onAccent }]}>
          {practicum.className} · {session.room}
        </Text>
        {participantCount && participantCount > 0 ? (
          <Text style={[styles.meta, { color: theme.onAccent }]}>
            {participantCount} peserta
          </Text>
        ) : null}
      </View>

      {practicum.assistantName ? (
        <Text numberOfLines={1} style={[styles.meta, { color: theme.onAccent }]}>
          Asisten: {practicum.assistantName}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  eyebrow: {
    ...Typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    ...Typography.screenTitle,
    fontSize: 24,
    lineHeight: 30,
  },
  meta: { ...Typography.caption },
  time: { ...Typography.bodyStrong, marginTop: Spacing.half },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  footerText: { flexShrink: 1 },
});
