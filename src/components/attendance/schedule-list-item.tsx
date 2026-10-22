import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Session, Practicum } from '../../types/attendance';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { StatusBadge } from '../ui/status-badge';

interface ScheduleListItemProps {
  session: Session;
  practicum: Practicum;
  onPress: () => void;
}

export const ScheduleListItem: React.FC<ScheduleListItemProps> = ({ session, practicum, onPress }) => {
  const theme = Colors.light;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
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
      
      <Text style={[styles.time, { color: theme.textPrimary }]}>
        {session.startTime}–{session.endTime}
      </Text>
    </TouchableOpacity>
  );
};

// Komponen Legend (Penjelasan Status)
export const StatusLegend = () => {
  const theme = Colors.light;
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
  meta: { fontSize: 14, marginBottom: Spacing.two },
  time: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  legendContainer: { marginTop: Spacing.three, paddingHorizontal: Spacing.one },
});