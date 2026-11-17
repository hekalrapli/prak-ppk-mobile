import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScheduleListItem } from '@/components/attendance/schedule-list-item';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { Spacing } from '@/constants/theme';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import { compareSessions } from '@/lib/session-date';
import { useAuth } from '@/store/auth-context';

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

  const rows = useMemo(
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

  if (loading) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <SkeletonCardList count={3} />
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

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.session.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[theme.textPrimary]}
            onRefresh={refresh}
            refreshing={refreshing}
            tintColor={theme.textSecondary}
          />
        }
        ListHeaderComponent={
          rows.length > 0 ? (
            <View style={styles.header}>
              <Text style={[styles.caption, { color: theme.textSecondary }]}>
                Sesi yang sudah ditutup. Buka kartu untuk melihat rekap kehadiran.
              </Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <EmptyState
            title="Belum ada riwayat"
            description="Sesi yang telah Anda tutup akan muncul di sini beserta rekap kehadirannya."
          />
        }
        renderItem={({ item }) => (
          <ScheduleListItem
            session={item.session}
            practicum={item.practicum}
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
          />
        )}
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
  header: { marginBottom: Spacing.three },
  caption: { fontSize: 13, lineHeight: 18 },
});
