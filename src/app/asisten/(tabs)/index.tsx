import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScheduleListItem } from '@/components/attendance/schedule-list-item';
import { SessionDateHeader } from '@/components/attendance/session-date-header';
import { SessionHighlightCard } from '@/components/attendance/session-highlight-card';
import { AppButton } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { StatusDot } from '@/components/ui/status-dot';
import { TabScreen } from '@/components/ui/tab-screen';
import { Spacing, Radius, Shadow, Typography } from '@/constants/theme';
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

  const renderHeader = () => (
    <View style={styles.header}>
      {isAsisten ? (
        <View style={styles.actionGroup}>
          <View style={styles.crudBar}>
            <View style={styles.crudButton}>
              <AppButton
                label="Tambah praktikum"
                variant={ownedPracticums.length === 0 ? 'primary' : 'secondary'}
                onPress={() => router.push('/asisten/practicum/form')}
              />
            </View>
            {ownedPracticums.length > 0 ? (
              <View style={styles.crudButton}>
                <AppButton
                  label="Tambah sesi"
                  onPress={() => router.push('/asisten/session/form')}
                />
              </View>
            ) : null}
          </View>
          <AppButton
            label="Kelola lokasi lab"
            variant="secondary"
            onPress={() => router.push('/asisten/labs')}
          />
        </View>
      ) : null}

      {ownedPracticums.length > 0 ? (
        <View
          style={[
            styles.practicumCard,
            Shadow.soft,
            { backgroundColor: theme.surface },
          ]}>
          <Text style={[styles.practicumHeading, { color: theme.textPrimary }]}>
            Kelola Praktikum & Peserta ({ownedPracticums.length})
          </Text>
          <View style={styles.practicumList}>
            {ownedPracticums.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Kelola ${item.name} kelas ${item.className}`}
                onPress={() =>
                  router.push({
                    pathname: '/asisten/practicum/[practicumId]',
                    params: { practicumId: item.id },
                  })
                }
                style={({ pressed }) => [
                  styles.practicumRow,
                  {
                    backgroundColor: theme.surfaceSubtle,
                    borderColor: theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <View style={styles.practicumInfo}>
                  <Text
                    numberOfLines={1}
                    style={[styles.practicumName, { color: theme.textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.practicumMeta, { color: theme.textSecondary }]}>
                    {item.className} · {item.studentIds?.length ?? 0} peserta
                  </Text>
                </View>
                <Text style={[styles.manageLink, { color: theme.link }]}>
                  Kelola
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

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
          <EmptyState
            title="Belum ada jadwal"
            description={
              ownedPracticums.length === 0
                ? 'Tambahkan praktikum baru untuk mulai mengelola peserta dan sesi jadwal.'
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
  actionGroup: { gap: Spacing.two },
  crudBar: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  crudButton: { flex: 1 },
  practicumCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  practicumHeading: { ...Typography.cardTitle },
  practicumList: { gap: Spacing.two },
  practicumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  practicumInfo: { flex: 1, minWidth: 0, gap: 2 },
  practicumName: { ...Typography.bodyStrong },
  practicumMeta: { ...Typography.caption },
  manageLink: { ...Typography.label },
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
