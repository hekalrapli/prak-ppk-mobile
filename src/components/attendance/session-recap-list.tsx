import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatusDot } from '@/components/ui/status-dot';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RecapEntry } from '@/lib/recap';
import type { Practicum, Session } from '@/types/attendance';

interface SessionRecapListProps {
  practicum: Practicum;
  session: Session;
  entries: RecapEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function SessionRecapList({
  practicum,
  session,
  entries,
  loading,
  error,
  onRetry,
}: SessionRecapListProps) {
  const theme = useTheme();

  if (loading) {
    return <LoadingState label="Memuat rekap kehadiran…" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  const hadirCount = entries.filter((entry) => entry.statusLabel === 'Hadir').length;
  const izinCount = entries.filter((entry) => entry.statusLabel === 'Izin').length;

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={[styles.summaryCard, Shadow.soft, { backgroundColor: theme.surface }]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{practicum.name}</Text>
          <StatusBadge status={session.status} />
        </View>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {session.date} · {session.startTime}–{session.endTime} · {practicum.className}
        </Text>
      </View>

      <Text style={[styles.count, { color: theme.textSecondary }]}>
        {entries.length} data tercatat ({hadirCount} Hadir, {izinCount} Izin)
      </Text>
    </View>
  );

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={
        <EmptyState
          title="Belum ada kehadiran"
          description="Kehadiran dan izin akan muncul di sini."
        />
      }
      renderItem={({ item }) => (
        <View style={[styles.itemCard, Shadow.soft, { backgroundColor: theme.surface }]}>
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: theme.textPrimary }]}>
                {item.name}
              </Text>
              <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>
                {item.identifier}
              </Text>
            </View>

            <View style={styles.badgeContainer}>
              <StatusDot
                label={item.statusLabel}
                tone={item.statusLabel === 'Hadir' ? 'success' : 'warning'}
              />
              <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                {item.timeDisplay}
              </Text>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  header: { gap: Spacing.two, marginBottom: Spacing.two },
  summaryCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  title: { ...Typography.cardTitle, flex: 1, minWidth: 0 },
  meta: { ...Typography.caption },
  count: { ...Typography.label, fontWeight: '600' },
  itemCard: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { ...Typography.bodyStrong },
  itemMeta: { ...Typography.caption, marginTop: Spacing.half },
  badgeContainer: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  timeText: {
    ...Typography.caption,
    fontVariant: ['tabular-nums'],
  },
});
