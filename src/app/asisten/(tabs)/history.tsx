import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { ScheduleListItem } from '@/components/attendance/schedule-list-item';
import { SessionDateHeader } from '@/components/attendance/session-date-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { TabScreen } from '@/components/ui/tab-screen';
import { Spacing } from '@/constants/theme';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import { compareSessions } from '@/lib/session-date';
import { useAuth } from '@/store/auth-context';
import type { Practicum, Session } from '@/types/attendance';

interface HistoryRow {
  session: Session;
  practicum: Practicum;
}

export default function AsistenHistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  const { practicums, sessions, loading, refreshing, error, retry, refresh } =
    usePracticumFeed('asisten', profile?.uid);

  const practicumById = useMemo(
    () => new Map(practicums.map((practicum) => [practicum.id, practicum])),
    [practicums]
  );

  const rows = useMemo<HistoryRow[]>(
    () =>
      sessions
        .filter((session) => session.status === 'closed')
        .flatMap((session) => {
          const practicum = practicumById.get(session.practicumId);
          return practicum ? [{ session, practicum }] : [];
        })
        .sort((a, b) => compareSessions(b.session, a.session)),
    [sessions, practicumById]
  );

  const sections = useMemo(() => {
    const grouped = new Map<string, HistoryRow[]>();
    rows.forEach((row) => {
      const existing = grouped.get(row.session.date) ?? [];
      existing.push(row);
      grouped.set(row.session.date, existing);
    });
    return Array.from(grouped, ([date, data]) => ({ title: date, data }));
  }, [rows]);

  if (loading) {
    return (
      <TabScreen title="Riwayat">
        <SkeletonCardList count={3} />
      </TabScreen>
    );
  }

  if (error) {
    return (
      <TabScreen title="Riwayat">
        <ErrorState message={error} onRetry={retry} />
      </TabScreen>
    );
  }

  return (
    <TabScreen title="Riwayat">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.session.id}
        style={styles.list}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            colors={[theme.primary]}
            onRefresh={refresh}
            refreshing={refreshing}
            tintColor={theme.textSecondary}
          />
        }
        ListHeaderComponent={<View style={styles.headerSpace} />}
        ListEmptyComponent={
          <EmptyState
            title="Belum ada riwayat"
            description="Sesi yang telah Anda tutup akan muncul di sini."
          />
        }
        renderSectionHeader={({ section }) => <SessionDateHeader date={section.title} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <ScheduleListItem
              assistantName={item.practicum.assistantName ?? profile?.name}
              onPress={() =>
                router.push({
                  pathname: '/asisten/session/[sessionId]/recap',
                  params: {
                    sessionId: item.session.id,
                    practicumId: item.practicum.id,
                  },
                })
              }
              practicum={item.practicum}
              session={item.session}
            />
          </View>
        )}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  headerSpace: { height: Spacing.two },
  item: { paddingBottom: Spacing.two },
});
