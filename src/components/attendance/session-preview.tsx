import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { useDemoData } from '../../store/demo-data-context';
import { UserRole } from '../../types/attendance';
import { StatusBadge } from '../ui/status-badge';

interface SessionPreviewProps {
  role: UserRole;
  sessionId: string;
}

export function SessionPreview({ role, sessionId }: SessionPreviewProps) {
  const theme = useTheme();
  const { state } = useDemoData();
  const session = state.sessions.find((candidate) => candidate.id === sessionId);
  const practicum = session
    ? state.practicums.find((candidate) => candidate.id === session.practicumId)
    : undefined;
  const assistant = practicum
    ? state.users.find((candidate) => candidate.id === practicum.assistantId)
    : undefined;

  if (!session || !practicum) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.notFound}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Sesi tidak ditemukan
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Sesi yang Anda cari tidak tersedia. Kembali ke jadwal untuk memilih sesi lain.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.date, { color: theme.textSecondary }]}>{session.date}</Text>
            <StatusBadge status={session.status} />
          </View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{practicum.name}</Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {practicum.className} · {session.room}
          </Text>
          <Text style={[styles.time, { color: theme.textPrimary }]}>
            {session.startTime}–{session.endTime}
          </Text>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Asisten</Text>
            <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
              {assistant?.name ?? '—'}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.note,
            { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
          ]}>
          <Text style={[styles.noteTitle, { color: theme.textPrimary }]}>
            {role === 'praktikan' ? 'Presensi sesi' : 'Pengelolaan sesi'}
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {role === 'praktikan'
              ? 'Detail sesi dan aksi presensi akan tersedia pada tahap implementasi berikutnya.'
              : 'Aksi buka/tutup sesi dan rekap kehadiran akan tersedia pada tahap implementasi berikutnya.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  date: { flexShrink: 1, fontSize: 12, fontWeight: '500' },
  title: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  meta: { fontSize: 14, lineHeight: 20 },
  time: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  divider: { height: 1, marginVertical: Spacing.one },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  detailLabel: { fontSize: 14 },
  detailValue: { flexShrink: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  note: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  noteTitle: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  body: { fontSize: 16, lineHeight: 24 },
  notFound: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
});
