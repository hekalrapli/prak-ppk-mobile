import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Session, Practicum } from '../../types/attendance';
import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { StatusBadge } from '../ui/status-badge';
import { StatusDot } from '../ui/status-dot';

interface ScheduleListItemProps {
  session: Session;
  practicum: Practicum;
  assistantName?: string;
  onPress: () => void;
}

export const ScheduleListItem: React.FC<ScheduleListItemProps> = ({
  session,
  practicum,
  assistantName,
  onPress,
}) => {
  const theme = useTheme();
  const assistantLabel = assistantName ?? '—';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${practicum.name}, ${session.date}, ${session.startTime} sampai ${session.endTime}, asisten ${assistantLabel}`}
    >
      <View style={styles.rowBetween}>
        <Text style={[styles.date, { color: theme.textSecondary }]}>{session.date}</Text>
        <StatusBadge status={session.status} />
      </View>

      <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={2}>
        {practicum.name}
      </Text>

      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {practicum.className} · {session.room}
      </Text>

      <Text numberOfLines={2} style={[styles.assistant, { color: theme.textSecondary }]}>
        Asisten: {assistantLabel}
      </Text>

      <Text style={[styles.time, { color: theme.textPrimary, marginTop: Spacing.one }]}>
        {session.startTime}–{session.endTime}
      </Text>
    </TouchableOpacity>
  );
};

// Komponen Legend (Penjelasan Status)
export const StatusLegend = () => {
  return (
    <View style={styles.legendContainer}>
      <StatusDot
        label="Belum dibuka — asisten belum membuka presensi"
        tone="muted"
      />
      <StatusDot
        label="Dibuka — presensi dapat dicatat sampai sesi ditutup"
        tone="success"
      />
      <StatusDot
        label="Ditutup — sesi selesai, presensi tidak tersedia"
        tone="neutral"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, marginBottom: Spacing.two },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.two },
  date: { fontSize: 12, fontWeight: '500' },
  title: { fontSize: 16, fontWeight: '600', marginBottom: Spacing.one },
  meta: { fontSize: 14, marginBottom: Spacing.one },
  assistant: { fontSize: 14, lineHeight: 20, marginBottom: Spacing.one },
  time: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  legendContainer: { marginTop: Spacing.three, paddingHorizontal: Spacing.one, gap: Spacing.two },
});
