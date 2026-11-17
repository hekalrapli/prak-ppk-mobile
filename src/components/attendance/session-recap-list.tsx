import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatusDot } from '@/components/ui/status-dot';
import { Radius, Spacing } from '@/constants/theme';
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
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{practicum.name}</Text>
          <StatusBadge status={session.status} />
        </View>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {session.date} · {session.startTime}–{session.endTime} · {practicum.className}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <Text style={[styles.count, { color: theme.textSecondary }]}>
          {entries.length} data tercatat ({hadirCount} Hadir, {izinCount} Izin)
        </Text>
      </View>
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
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
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
  title: { flex: 1, minWidth: 0, fontSize: 19, fontWeight: '700', lineHeight: 27 },
  meta: { fontSize: 15, lineHeight: 22 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  groupItem: { borderLeftWidth: 1, borderRightWidth: 1, padding: Spacing.three },
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: 14,
    marginTop: 2,
  },
  badgeContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeText: {
    fontSize: 13,
  },
});
