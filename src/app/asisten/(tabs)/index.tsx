import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScheduleListItem, StatusLegend } from '@/components/attendance/schedule-list-item';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { StatusDot } from '@/components/ui/status-dot';
import { Spacing, Radius } from '@/constants/theme';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';

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

  const rows = useMemo(
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

  if (loading) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <SkeletonCardList count={4} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <ErrorState message={error} onRetry={retry} />
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.greeting, { color: theme.textPrimary }]}>
        Halo, {profile?.name ?? 'Asisten'}
      </Text>
      <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
        Asisten · {profile?.identifier ?? '—'}
      </Text>

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Sesi Praktikum{' '}
          <Text style={[styles.count, { color: theme.textSecondary }]}>
            ({rows.length} sesi)
          </Text>
        </Text>
      </View>
      <View style={[styles.summary, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <StatusDot label={`${counts.open} dibuka`} tone="success" />
        <StatusDot label={`${counts.upcoming} belum dibuka`} tone="muted" />
        <StatusDot label={`${counts.closed} ditutup`} tone="neutral" />
      </View>

      <Text style={[styles.sectionHint, { color: theme.textSecondary }]}>
        Hanya praktikum yang Anda ampu sebagai asisten pengampu.
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.session.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            colors={[theme.textPrimary]}
            onRefresh={refresh}
            refreshing={refreshing}
            tintColor={theme.textSecondary}
          />
        }
        ListHeaderComponent={renderHeader}
        ListFooterComponent={rows.length > 0 ? <StatusLegend /> : undefined}
        ListEmptyComponent={
          <EmptyState
            title="Belum ada jadwal"
            description="Belum ada sesi untuk praktikum yang Anda ampu. Pastikan penugasan asisten dan jadwal sesi sudah dibuat."
          />
        }
        renderItem={({ item }) => (
          <ScheduleListItem
            session={item.session}
            practicum={item.practicum}
            assistantName={item.practicum.assistantName ?? profile?.name}
            onPress={() =>
              router.push({
                pathname: '/asisten/session/[sessionId]',
                params: {
                  sessionId: item.session.id,
                  practicumId: item.practicum.id,
                },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  header: { marginBottom: Spacing.three },
  greeting: { fontSize: 24, fontWeight: '700', lineHeight: 32, marginBottom: Spacing.one },
  userMeta: { fontSize: 14, lineHeight: 20, marginBottom: Spacing.four },
  sectionRow: { marginBottom: Spacing.one },
  sectionTitle: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  count: { fontSize: 14, fontWeight: '400' },
  sectionHint: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.two },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
});
