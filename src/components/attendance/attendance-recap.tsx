import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { useDemoData } from '../../store/demo-data-context';
import { AttendanceRecord, DemoUser } from '../../types/attendance';
import { EmptyState } from '../ui/empty-state';
import { StatusBadge } from '../ui/status-badge';
import { AttendanceRecordItem } from './attendance-record-item';

interface AttendanceRecapProps {
  sessionId: string;
}

interface RecapEntry {
  record: AttendanceRecord;
  praktikan: DemoUser;
}

export function AttendanceRecap({ sessionId }: AttendanceRecapProps) {
  const router = useRouter();
  const theme = useTheme();
  const { state } = useDemoData();

  const session = state.sessions.find((candidate) => candidate.id === sessionId);
  const practicum = session
    ? state.practicums.find((candidate) => candidate.id === session.practicumId)
    : undefined;

  if (!session || !practicum) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.notFound}>
          <EmptyState
            title="Sesi tidak ditemukan"
            description="Sesi yang Anda cari tidak tersedia. Kembali ke jadwal untuk memilih sesi lain."
            actionLabel="Kembali ke jadwal"
            onAction={() => router.replace('/asisten')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const entries: RecapEntry[] = state.attendanceRecords
    .filter((record) => record.sessionId === sessionId)
    .map((record) => ({
      record,
      praktikan: state.users.find((user) => user.id === record.praktikanId),
    }))
    .filter((entry): entry is RecapEntry => Boolean(entry.praktikan))
    .sort((left, right) => left.record.recordedAt.localeCompare(right.record.recordedAt));

  const renderHeader = () => (
    <View style={styles.header}>
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {practicum.name}
          </Text>
          <StatusBadge status={session.status} />
        </View>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {session.date} · {session.startTime}–{session.endTime} · {practicum.className}
        </Text>
      </View>
      <Text style={[styles.count, { color: theme.textSecondary }]}>
        {entries.length} kehadiran tercatat
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.record.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            title="Belum ada kehadiran"
            description="Kehadiran yang dicatat akan muncul di sini."
          />
        }
        renderItem={({ item, index }) => {
          const isFirst = index === 0;
          const isLast = index === entries.length - 1;

          return (
            <View
              style={[
                styles.groupItem,
                { backgroundColor: theme.surface, borderColor: theme.border },
                isFirst && styles.groupFirst,
                isLast && styles.groupLast,
                !isLast && styles.groupDivider,
              ]}>
              <AttendanceRecordItem
                name={item.praktikan.name}
                meta={item.praktikan.identifier}
                recordedAt={item.record.recordedAt}
              />
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  header: { gap: Spacing.two, marginBottom: Spacing.two },
  summaryCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  title: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '700', lineHeight: 26 },
  meta: { fontSize: 14, lineHeight: 20 },
  count: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  groupItem: { borderLeftWidth: 1, borderRightWidth: 1 },
  groupFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  groupLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  groupDivider: { borderBottomWidth: 1 },
  notFound: { flex: 1, justifyContent: 'center', padding: Spacing.three },
});
