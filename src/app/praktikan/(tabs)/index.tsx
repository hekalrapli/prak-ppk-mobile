import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { SessionDateHeader } from '@/components/attendance/session-date-header';
import { SessionHighlightCard } from '@/components/attendance/session-highlight-card';
import { ScheduleTimelineItem } from '@/components/attendance/schedule-timeline-item';
import { isSessionHappeningNow } from '@/components/attendance/now-marker';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { TabScreen } from '@/components/ui/tab-screen';
import { Spacing } from '@/constants/theme';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';
import type { Practicum, Session } from '@/types/attendance';

interface ScheduleRow {
  session: Session;
  practicum: Practicum;
}

export default function PraktikanScheduleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  const { practicums, sessions, loading, refreshing, error, retry, refresh } =
    usePracticumFeed('praktikan', profile?.uid);

  const practicumById = useMemo(
    () => new Map(practicums.map((practicum) => [practicum.id, practicum])),
    [practicums]
  );

  const rows = useMemo<ScheduleRow[]>(
    () =>
      sessions.flatMap((session) => {
        const practicum = practicumById.get(session.practicumId);
        return practicum ? [{ session, practicum }] : [];
      }),
    [sessions, practicumById]
  );

  const highlight = useMemo(() => {
    const open = rows.find((row) => row.session.status === 'open');
    if (open) {
      return open;
    }
    return rows.find((row) => row.session.status === 'upcoming');
  }, [rows]);

  const listRows = useMemo(
    () => rows.filter((row) => row.session.id !== highlight?.session.id),
    [rows, highlight]
  );

  const sections = useMemo(() => {
    const grouped = new Map<string, ScheduleRow[]>();
    listRows.forEach((row) => {
      const existing = grouped.get(row.session.date) ?? [];
      existing.push(row);
      grouped.set(row.session.date, existing);
    });
    return Array.from(grouped, ([date, data]) => ({ title: date, data }));
  }, [listRows]);

  const now = new Date();

  if (loading) {
    return (
      <TabScreen title="Jadwal">
        <SkeletonCardList count={4} />
      </TabScreen>
    );
  }

  if (error) {
    return (
      <TabScreen title="Jadwal">
        <ErrorState message={error} onRetry={retry} />
      </TabScreen>
    );
  }

  const openSession = (practicum: Practicum, session: Session) => {
    router.push({
      pathname: '/praktikan/session/[sessionId]',
      params: { sessionId: session.id, practicumId: practicum.id },
    });
  };

  return (
    <TabScreen title="Jadwal">
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
        ListHeaderComponent={
          highlight ? (
            <View style={styles.highlight}>
              <SessionHighlightCard
                onPress={() => openSession(highlight.practicum, highlight.session)}
                participantCount={highlight.practicum.studentIds?.length}
                practicum={highlight.practicum}
                session={highlight.session}
              />
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <EmptyState
            title="Belum ada jadwal"
            description="Belum ada sesi untuk praktikum yang Anda ikuti."
          />
        }
        renderSectionHeader={({ section }) => <SessionDateHeader date={section.title} />}
        renderItem={({ item }) => (
          <ScheduleTimelineItem
            isNow={isSessionHappeningNow(item.session, now)}
            onPress={() => openSession(item.practicum, item.session)}
            participantCount={item.practicum.studentIds?.length}
            practicum={item.practicum}
            session={item.session}
          />
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
  highlight: {
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
});
