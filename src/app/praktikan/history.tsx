import { Redirect, useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttendanceRecordItem } from '@/components/attendance/attendance-record-item';
import { EmptyState } from '@/components/ui/empty-state';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDemoData } from '@/store/demo-data-context';
import { AttendanceRecord, Practicum, Session } from '@/types/attendance';

interface HistoryEntry {
  record: AttendanceRecord;
  session: Session;
  practicum: Practicum;
}

export default function PraktikanHistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { state } = useDemoData();
  const user = state.users.find((candidate) => candidate.id === state.activeUserId);

  if (!user) {
    return <Redirect href="/" />;
  }

  if (state.activeRole !== 'praktikan' || user.role !== 'praktikan') {
    return <Redirect href={state.activeRole === 'asisten' ? '/asisten' : '/'} />;
  }

  const entries: HistoryEntry[] = state.attendanceRecords
    .filter((record) => record.praktikanId === user.id)
    .map((record) => {
      const session = state.sessions.find((candidate) => candidate.id === record.sessionId);
      const practicum = session
        ? state.practicums.find((candidate) => candidate.id === session.practicumId)
        : undefined;

      return { record, session, practicum };
    })
    .filter((entry): entry is HistoryEntry => Boolean(entry.session && entry.practicum))
    .reverse();

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.count, { color: theme.textPrimary }]}>
        {entries.length} kehadiran
      </Text>
      <Text style={[styles.caption, { color: theme.textSecondary }]}>
        Hanya menampilkan data Anda.
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
            title="Belum ada riwayat kehadiran"
            description="Catat kehadiran pada sesi yang dibuka untuk melihat riwayat."
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
                name={item.practicum.name}
                meta={item.session.date}
                recordedAt={item.record.recordedAt}
                onPress={() =>
                  router.push({
                    pathname: '/praktikan/session/[sessionId]',
                    params: { sessionId: item.session.id },
                  })
                }
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
  header: { gap: Spacing.one, marginBottom: Spacing.three },
  count: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  caption: { fontSize: 14, lineHeight: 20 },
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
});
