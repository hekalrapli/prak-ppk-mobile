import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatusDot, type StatusTone } from '@/components/ui/status-dot';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDistanceMeters } from '@/lib/format-distance';
import {
  summarizeRecapEntries,
  type RecapCategory,
  type RecapEntry,
} from '@/lib/recap';
import type { Practicum, Session } from '@/types/attendance';
import type { Laboratory } from '@/types/location';

type RecapFilter = 'all' | RecapCategory;

interface SessionRecapListProps {
  practicum: Practicum;
  session: Session;
  entries: RecapEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  laboratory?: Laboratory | null;
}

const CATEGORY_TONES: Record<RecapCategory, StatusTone> = {
  in_radius: 'success',
  out_of_radius: 'error',
  leave: 'warning',
  absent: 'muted',
};

function getEntryDetailText(item: RecapEntry): string {
  switch (item.category) {
    case 'in_radius':
      return typeof item.distanceMeter === 'number'
        ? `Hadir · ${formatDistanceMeters(item.distanceMeter)} dari titik lab`
        : 'Hadir · Lokasi terverifikasi';
    case 'out_of_radius':
      return typeof item.distanceMeter === 'number'
        ? `Di luar radius · ${formatDistanceMeters(item.distanceMeter)} dari titik lab`
        : 'Lokasi belum terverifikasi';
    case 'leave':
      return 'Izin disetujui';
    case 'absent':
      return 'Belum mencatat kehadiran';
  }
}

export function SessionRecapList({
  practicum,
  session,
  entries,
  loading,
  error,
  onRetry,
  laboratory,
}: SessionRecapListProps) {
  const theme = useTheme();
  const [selectedFilter, setSelectedFilter] = useState<RecapFilter>('all');

  const summary = useMemo(() => summarizeRecapEntries(entries), [entries]);

  const filteredEntries = useMemo(
    () =>
      selectedFilter === 'all'
        ? entries
        : entries.filter((entry) => entry.category === selectedFilter),
    [entries, selectedFilter]
  );

  if (loading) {
    return <LoadingState label="Memuat rekap kehadiran…" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  const labMetaText =
    laboratory && laboratory.radiusMeter > 0
      ? `${laboratory.name} · Radius maks ${formatDistanceMeters(laboratory.radiusMeter)}`
      : `${session.room || 'Lokasi sesi'} · Radius lab belum diatur`;

  const filterOptions: { value: RecapFilter; label: string; count: number }[] = [
    { value: 'all', label: 'Semua', count: summary.totalParticipants },
    { value: 'in_radius', label: 'Dalam radius', count: summary.inRadiusCount },
    { value: 'out_of_radius', label: 'Di luar radius', count: summary.outOfRadiusCount },
    { value: 'leave', label: 'Izin', count: summary.leaveCount },
    { value: 'absent', label: 'Belum hadir', count: summary.absentCount },
  ];

  const renderSummaryTile = (
    label: string,
    count: number,
    backgroundColor: string,
    accentColor: string
  ) => (
    <View style={[styles.statTile, { backgroundColor }]}>
      <Text style={[styles.statValue, { color: accentColor }]}>{count}</Text>
      <Text numberOfLines={1} style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );

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
        <Text style={[styles.labMeta, { color: theme.textSecondary }]}>{labMetaText}</Text>
      </View>

      <View style={styles.statGrid}>
        <View style={styles.statRow}>
          {renderSummaryTile(
            'Dalam radius',
            summary.inRadiusCount,
            theme.successSoft,
            theme.success
          )}
          {renderSummaryTile(
            'Di luar radius',
            summary.outOfRadiusCount,
            theme.errorSoft,
            theme.error
          )}
        </View>
        <View style={styles.statRow}>
          {renderSummaryTile('Izin', summary.leaveCount, theme.warningSoft, theme.warning)}
          {renderSummaryTile(
            'Belum hadir',
            summary.absentCount,
            theme.surfaceSubtle,
            theme.textSecondary
          )}
        </View>
      </View>

      <View style={styles.verificationMeta}>
        <Text style={[styles.count, { color: theme.textPrimary }]}>
          {summary.inRadiusCount} dari {summary.totalParticipants} peserta hadir terverifikasi
        </Text>
        {summary.outOfRadiusCount > 0 ? (
          <Text style={[styles.exclusionNote, { color: theme.error }]}>
            {summary.outOfRadiusCount} catatan di luar radius atau belum terverifikasi tidak
            dihitung dalam jumlah hadir berhasil.
          </Text>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {filterOptions.map((option) => {
          const active = selectedFilter === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedFilter(option.value)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? theme.primary : theme.surface,
                  borderColor: active ? theme.primary : theme.border,
                },
              ]}>
              <Text
                style={[
                  styles.filterText,
                  { color: active ? theme.onPrimary : theme.textSecondary },
                ]}>
                {option.label} ({option.count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const emptyState =
    entries.length === 0 ? (
      <EmptyState
        title="Belum ada peserta"
        description="Peserta, kehadiran, dan izin sesi ini akan muncul secara real-time di sini."
      />
    ) : (
      <EmptyState
        title="Tidak ada peserta di kategori ini"
        description="Pilih filter lain untuk melihat seluruh daftar peserta."
      />
    );

  return (
    <FlatList
      data={filteredEntries}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={styles.content}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={emptyState}
      renderItem={({ item }) => {
        const tone = CATEGORY_TONES[item.category];
        const detailColor =
          item.category === 'out_of_radius'
            ? theme.error
            : item.category === 'in_radius'
              ? theme.success
              : theme.textSecondary;

        return (
          <View style={[styles.itemCard, Shadow.soft, { backgroundColor: theme.surface }]}>
            <View style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.textPrimary }]}>
                  {item.name}
                </Text>
                <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>
                  {item.identifier || 'NIM belum tercatat'}
                </Text>
                <Text style={[styles.itemDetail, { color: detailColor }]}>
                  {getEntryDetailText(item)}
                </Text>
              </View>

              <View style={styles.badgeContainer}>
                <StatusDot label={item.statusLabel} tone={tone} />
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
  list: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  header: { gap: Spacing.two, marginBottom: Spacing.one },
  summaryCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  title: { ...Typography.cardTitle, flex: 1, minWidth: 0 },
  meta: { ...Typography.caption },
  labMeta: { ...Typography.caption, fontWeight: '600' },
  statGrid: {
    gap: Spacing.two,
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statTile: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
  },
  statValue: {
    ...Typography.sectionTitle,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    ...Typography.caption,
  },
  verificationMeta: {
    gap: Spacing.half,
    paddingTop: Spacing.half,
  },
  count: {
    ...Typography.label,
    fontWeight: '600',
  },
  exclusionNote: {
    ...Typography.caption,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  filterChip: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.three,
  },
  filterText: {
    ...Typography.caption,
    fontWeight: '600',
  },
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
  itemDetail: { ...Typography.caption, fontWeight: '600', marginTop: Spacing.one },
  badgeContainer: {
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  timeText: {
    ...Typography.caption,
    fontVariant: ['tabular-nums'],
  },
});
