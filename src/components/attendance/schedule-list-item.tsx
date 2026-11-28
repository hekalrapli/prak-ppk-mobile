import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatSessionDateDisplay } from '@/lib/session-date';
import type { Practicum, Session, SessionStatus } from '@/types/attendance';

interface ScheduleListItemProps {
  session: Session;
  practicum: Practicum;
  assistantName?: string;
  /** Sembunyikan baris jam di dalam kartu saat rentang jam sudah tampil di kolom kiri timeline. */
  hideTime?: boolean;
  /** Tampilkan tanggal di kartu (dipakai pada grup lintas tanggal seperti "Sedang dibuka"). */
  showDate?: boolean;
  onPress: () => void;
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  open: 'Dibuka',
  upcoming: 'Belum dibuka',
  closed: 'Ditutup',
};

/**
 * Kartu sesi dengan latar seragam bersih dan badge status semantik berlabel teks:
 * - `open`: kartu permukaan utama + border hijau tipis + badge hijau "Dibuka".
 * - `upcoming`: kartu permukaan utama + badge hangat "Belum dibuka".
 * - `closed`: kartu netral kalem + badge netral berbingkai "Ditutup".
 */
export function ScheduleListItem({
  session,
  practicum,
  assistantName,
  hideTime = false,
  showDate = false,
  onPress,
}: ScheduleListItemProps) {
  const theme = useTheme();
  const statusLabel = STATUS_LABEL[session.status];
  const resolvedAssistant = assistantName ?? practicum.assistantName;

  const isOpen = session.status === 'open';
  const isClosed = session.status === 'closed';

  const cardBackground = isClosed ? theme.surfaceSubtle : theme.surface;
  const cardBorderColor = isOpen ? theme.success : theme.border;
  const cardBorderWidth = isOpen ? 1.5 : 1;

  const badgeStyle = isOpen
    ? {
        backgroundColor: theme.successSoft,
        borderColor: 'transparent',
        dotColor: theme.success,
        textColor: theme.success,
      }
    : isClosed
      ? {
          backgroundColor: theme.surface,
          borderColor: theme.borderStrong,
          dotColor: theme.textTertiary,
          textColor: theme.textSecondary,
        }
      : {
          backgroundColor: theme.primarySoft,
          borderColor: 'transparent',
          dotColor: theme.link,
          textColor: theme.link,
        };

  return (
    <Pressable
      accessibilityLabel={`${practicum.name}, ${session.date}, ${session.startTime} sampai ${session.endTime}, asisten ${resolvedAssistant ?? 'tidak diketahui'}, status ${statusLabel}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !isClosed && Shadow.soft,
        {
          backgroundColor: cardBackground,
          borderColor: cardBorderColor,
          borderWidth: cardBorderWidth,
          opacity: pressed ? 0.86 : 1,
        },
      ]}>
      <View style={styles.topRow}>
        <Text numberOfLines={2} style={[styles.title, { color: theme.textPrimary }]}>
          {practicum.name}
        </Text>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: badgeStyle.backgroundColor,
              borderColor: badgeStyle.borderColor,
              borderWidth: isClosed ? 1 : 0,
            },
          ]}>
          <View
            style={[styles.statusDot, { backgroundColor: badgeStyle.dotColor }]}
          />
          <Text style={[styles.statusText, { color: badgeStyle.textColor }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {showDate ? (
        <Text numberOfLines={1} style={[styles.meta, { color: theme.textSecondary }]}>
          {formatSessionDateDisplay(session.date)}
        </Text>
      ) : null}

      {!hideTime ? (
        <Text style={[styles.time, { color: theme.textPrimary }]}>
          {session.startTime}–{session.endTime} WIB
        </Text>
      ) : null}

      <Text numberOfLines={1} style={[styles.meta, { color: theme.textSecondary }]}>
        {practicum.className} · {session.room}
      </Text>

      {resolvedAssistant ? (
        <Text numberOfLines={1} style={[styles.meta, { color: theme.textSecondary }]}>
          Asisten: {resolvedAssistant}
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    flexShrink: 0,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  time: {
    ...Typography.label,
    marginTop: Spacing.one,
    fontVariant: ['tabular-nums'],
  },
  meta: { ...Typography.caption },
});
