import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { ScheduleListItem } from '@/components/attendance/schedule-list-item';
import { SessionDateHeader } from '@/components/attendance/session-date-header';
import { SessionHighlightCard } from '@/components/attendance/session-highlight-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { StatusDot } from '@/components/ui/status-dot';
import { TabScreen } from '@/components/ui/tab-screen';
import { Radius, Spacing } from '@/constants/theme';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';
import type { Practicum, Session } from '@/types/attendance';

interface ScheduleRow {
  session: Session;
  practicum: Practicum;
}

export default function AsistenScheduleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  const { practicums, sessions, loading, refreshing, error, retry, refresh } =
    usePracticumFeed('asisten', profile?.uid);

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

  const counts = useMemo(
    () => ({
      open: sessions.filter((session) => session.status === 'open').length,
      upcoming: sessions.filter((session) => session.status === 'upcoming').length,
      closed: sessions.filter((session) => session.status === 'closed').length,
    }),
    [sessions]
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

  const isAsisten = profile?.role === 'asisten';
  const ownedPracticums =
    isAsisten && profile?.uid
      ? practicums.filter((item) => item.assistantId === profile.uid)
      : [];

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
      pathname: '/asisten/session/[sessionId]',
      params: { sessionId: session.id, practicumId: practicum.id },
    });
  };

  const renderHeader = () => {
    if (rows.length === 0) {
      return null;
    }

    return (
      <View style={styles.header}>
        {highlight ? (
          <SessionHighlightCard
            onPress={() => openSession(highlight.practicum, highlight.session)}
            participantCount={highlight.practicum.studentIds?.length}
            practicum={highlight.practicum}
            session={highlight.session}
          />
        ) : null}

        <View style={[styles.summary, { backgroundColor: theme.surfaceSubtle }]}>
          <StatusDot label={`${counts.open} dibuka`} tone="success" />
          <StatusDot label={`${counts.upcoming} belum dibuka`} tone="muted" />
          <StatusDot label={`${counts.closed} ditutup`} tone="neutral" />
        </View>
      </View>
    );
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
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          rows.length === 0 ? (
            <EmptyState
              title="Belum ada jadwal"
              description={
                ownedPracticums.length === 0
                  ? 'Tambahkan praktikum baru di tab Kelola untuk mulai mengatur peserta dan sesi jadwal.'
                  : 'Belum ada sesi terjadwal. Tambahkan sesi baru untuk praktikum yang Anda ampu.'
              }
              actionLabel={
                isAsisten
                  ? ownedPracticums.length === 0
                    ? 'Tambah praktikum'
                    : 'Tambah sesi'
                  : undefined
              }
              onAction={
                isAsisten
                  ? () =>
                      router.push(
                        ownedPracticums.length === 0
                          ? '/asisten/practicum/form'
                          : '/asisten/session/form'
                      )
                  : undefined
              }
            />
          ) : undefined
        }
        renderSectionHeader={({ section }) => <SessionDateHeader date={section.title} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <ScheduleListItem
              assistantName={item.practicum.assistantName ?? profile?.name}
              onPress={() => openSession(item.practicum, item.session)}
              participantCount={item.practicum.studentIds?.length}
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
  header: { gap: Spacing.three, marginTop: Spacing.two, marginBottom: Spacing.one },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  item: { paddingBottom: Spacing.two },
});
