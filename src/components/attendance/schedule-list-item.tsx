import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Session, Practicum } from '../../types/attendance';
import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { StatusBadge } from '../ui/status-badge';

interface ScheduleListItemProps {
  session: Session;
  practicum: Practicum;
  assistantName?: string;
  isAssignedToActiveUser?: boolean;
  onPress: () => void;
}

export const ScheduleListItem: React.FC<ScheduleListItemProps> = ({
  session,
  practicum,
  assistantName,
  isAssignedToActiveUser = false,
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
      accessibilityLabel={`${practicum.name}, ${session.date}, ${session.startTime} sampai ${session.endTime}, asisten ${assistantLabel}${isAssignedToActiveUser ? ', sesi Anda' : ''}`}
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

      <View style={styles.assistantRow}>
        <Text
          numberOfLines={2}
          style={[styles.assistant, { color: theme.textSecondary }]}>
          Asisten: {assistantLabel}
        </Text>
        {isAssignedToActiveUser ? (
          <View style={[styles.ownBadge, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.ownBadgeLabel, { color: theme.primary }]}>Sesi Anda</Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.time, { color: theme.textPrimary }]}>
        {session.startTime}–{session.endTime}
      </Text>
    </TouchableOpacity>
  );
};

// Komponen Legend (Penjelasan Status)
export const StatusLegend = () => {
  const theme = useTheme();
  return (
    <View style={styles.legendContainer}>
      <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>• <Text style={{fontWeight: '600'}}>Belum dibuka</Text>: Asisten belum membuka presensi.</Text>
      <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>• <Text style={{fontWeight: '600'}}>Dibuka</Text>: Presensi dapat dicatat sampai sesi ditutup.</Text>
      <Text style={{ fontSize: 12, color: theme.textSecondary }}>• <Text style={{fontWeight: '600'}}>Ditutup</Text>: Sesi selesai; presensi tidak lagi tersedia.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, marginBottom: Spacing.two },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.two },
  date: { fontSize: 12, fontWeight: '500' },
  title: { fontSize: 16, fontWeight: '600', marginBottom: Spacing.one },
  meta: { fontSize: 14, marginBottom: Spacing.one },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  assistant: { flexShrink: 1, fontSize: 14, lineHeight: 20 },
  ownBadge: {
    flexShrink: 0,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.xs,
  },
  ownBadgeLabel: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  time: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  legendContainer: { marginTop: Spacing.three, paddingHorizontal: Spacing.one },
});
