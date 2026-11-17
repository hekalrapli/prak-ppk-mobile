import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScheduleListItem, StatusLegend } from '@/components/attendance/schedule-list-item';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { Spacing } from '@/constants/theme';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';

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

  const rows = useMemo(
    () =>
      sessions.flatMap((session) => {
        const practicum = practicumById.get(session.practicumId);
        return practicum ? [{ session, practicum }] : [];
      }),
    [sessions, practicumById]
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
        Halo, {profile?.name ?? 'Praktikan'}
      </Text>
      <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
        {profile?.identifier ?? '—'}
      </Text>

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Jadwal Praktikum{' '}
          <Text style={[styles.count, { color: theme.textSecondary }]}>
            ({rows.length} sesi)
          </Text>
        </Text>
      </View>
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
            description="Belum ada sesi untuk praktikum yang Anda ikuti. Pastikan Anda sudah terdaftar sebagai peserta dan jadwal sesi sudah dibuat."
          />
        }
        renderItem={({ item }) => (
          <ScheduleListItem
            session={item.session}
            practicum={item.practicum}
            assistantName={item.practicum.assistantName}
            onPress={() =>
              router.push({
                pathname: '/praktikan/session/[sessionId]',
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
  sectionRow: {
    marginBottom: Spacing.two,
  },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '600', lineHeight: 26 },
  count: { fontSize: 14, fontWeight: '400' },
});
