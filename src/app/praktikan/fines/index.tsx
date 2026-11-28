// src/app/praktikan/fines/index.tsx
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaymentStatusBadge } from '@/components/payments/payment-status-badge';
import { AppButton } from '@/components/ui/app-button';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import {
  SegmentedControl,
  type SegmentOption,
} from '@/components/ui/segmented-control';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { usePraktikanFines } from '@/hooks/use-praktikan-fines';
import { useTheme } from '@/hooks/use-theme';
import { formatRupiah } from '@/services/labService';
import { formatTimestampDate } from '@/services/paymentDataService';
import { useAuth } from '@/store/auth-context';
import type { FineDoc } from '@/types/attendance';

type FineListFilter = 'all' | 'active' | 'success';

export default function PraktikanFinesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { fines, summary, loading, refreshing, error, retry, refresh } =
    usePraktikanFines(profile?.uid);

  const [filter, setFilter] = useState<FineListFilter>('all');

  const filterOptions = useMemo<SegmentOption<FineListFilter>[]>(
    () => [
      { value: 'all', label: 'Semua', count: fines.length },
      { value: 'active', label: 'Belum Lunas', count: summary.actionableCount },
      { value: 'success', label: 'Lunas', count: summary.successCount },
    ],
    [fines.length, summary.actionableCount, summary.successCount]
  );

  const filteredFines = useMemo(() => {
    if (filter === 'active') {
      return fines.filter((fine) => fine.status !== 'success');
    }
    if (filter === 'success') {
      return fines.filter((fine) => fine.status === 'success');
    }
    return fines;
  }, [fines, filter]);

  const openFineDetail = (fine: FineDoc) => {
    router.push({
      pathname: '/praktikan/fines/[fineId]',
      params: { fineId: fine.id },
    });
  };

  return (
    <DetailScreen title="Tagihan Denda">
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
        ]}>
        <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

        {loading ? (
          <View style={styles.stateWrap}>
            <SkeletonCardList count={3} />
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <ErrorState message={error} onRetry={retry} />
          </View>
        ) : (
          <FlatList
            data={filteredFines}
            keyExtractor={(item) => item.id}
            style={styles.flex}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                colors={[theme.primary]}
                onRefresh={refresh}
                refreshing={refreshing}
                tintColor={theme.textSecondary}
              />
            }
            ListHeaderComponent={
              <View style={styles.headerBlock}>
                <View
                  style={[
                    styles.summaryCard,
                    Shadow.soft,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                    Total denda belum lunas
                  </Text>
                  <Text
                    style={[
                      styles.summaryAmount,
                      {
                        color:
                          summary.totalOutstandingAmount > 0
                            ? theme.link
                            : theme.success,
                      },
                    ]}>
                    {formatRupiah(summary.totalOutstandingAmount)}
                  </Text>
                  <Text style={[styles.summaryMeta, { color: theme.textSecondary }]}>
                    {summary.actionableCount > 0
                      ? `${summary.actionableCount} tagihan perlu diselesaikan · ${summary.successCount} lunas`
                      : summary.successCount > 0
                        ? `Seluruh ${summary.successCount} tagihan denda telah lunas`
                        : 'Tidak ada tagihan denda keterlambatan'}
                  </Text>

                  <View style={styles.summaryActions}>
                    <AppButton
                      label="Riwayat Pembayaran"
                      onPress={() => router.push('/praktikan/payments')}
                      variant="secondary"
                    />
                  </View>
                </View>

                {fines.length > 0 ? (
                  <SegmentedControl
                    onChange={setFilter}
                    options={filterOptions}
                    value={filter}
                  />
                ) : null}
              </View>
            }
            ListEmptyComponent={
              fines.length === 0 ? (
                <EmptyState
                  title="Belum ada tagihan denda"
                  description="Tagihan denda keterlambatan akan muncul di sini secara otomatis apabila Anda presensi melewati batas grace period."
                />
              ) : (
                <EmptyState
                  title={
                    filter === 'active'
                      ? 'Tidak ada tagihan belum lunas'
                      : 'Belum ada tagihan lunas'
                  }
                  description={
                    filter === 'active'
                      ? 'Seluruh tagihan denda Anda sudah berhasil dibayar.'
                      : 'Selesaikan pembayaran tagihan aktif untuk melihat daftar denda lunas.'
                  }
                  actionLabel="Tampilkan semua tagihan"
                  onAction={() => setFilter('all')}
                />
              )
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityLabel={`Tagihan ${item.practicumName}, nominal ${formatRupiah(item.amount)}`}
                accessibilityRole="button"
                onPress={() => openFineDetail(item)}
                style={({ pressed }) => [
                  styles.card,
                  Shadow.soft,
                  {
                    backgroundColor: theme.surface,
                    borderColor:
                      item.status === 'failed'
                        ? theme.error
                        : item.status === 'success'
                          ? theme.border
                          : theme.borderStrong,
                    opacity: pressed ? 0.86 : 1,
                  },
                ]}>
                <View style={styles.rowBetween}>
                  <Text
                    numberOfLines={2}
                    style={[styles.cardTitle, { color: theme.textPrimary }]}>
                    {item.practicumName}
                  </Text>
                  <PaymentStatusBadge status={item.status} />
                </View>

                <Text numberOfLines={1} style={[styles.meta, { color: theme.textSecondary }]}>
                  {item.sessionDate || formatTimestampDate(item.createdAt)}
                  {item.labName ? ` · ${item.labName}` : ''}
                </Text>

                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  Terlambat +{item.lateMinutes} menit (toleransi {item.gracePeriodMinutes} mnt)
                </Text>

                <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                  <Text style={[styles.amount, { color: theme.textPrimary }]}>
                    {formatRupiah(item.amount)}
                  </Text>
                  <View style={styles.ctaRow}>
                    <Text style={[styles.ctaLabel, { color: theme.link }]}>
                      {item.status === 'success'
                        ? 'Lihat rincian'
                        : item.status === 'failed'
                          ? 'Bayar ulang'
                          : item.status === 'pending'
                            ? 'Cek status'
                            : 'Bayar sekarang'}
                    </Text>
                    <SymbolView
                      name={{
                        ios: 'chevron.right',
                        android: 'chevron_right',
                        web: 'chevron_right',
                      }}
                      size={16}
                      tintColor={theme.link}
                    />
                  </View>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: {
    flex: 1,
    marginTop: -Spacing.four,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.two,
  },
  stateWrap: {
    flex: 1,
    padding: Spacing.three,
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  headerBlock: { gap: Spacing.three },
  summaryCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  summaryLabel: { ...Typography.caption },
  summaryAmount: {
    ...Typography.display,
    fontVariant: ['tabular-nums'],
  },
  summaryMeta: { ...Typography.caption },
  summaryActions: { marginTop: Spacing.two },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitle: {
    ...Typography.cardTitle,
    flex: 1,
    minWidth: 0,
  },
  meta: { ...Typography.caption },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
  },
  amount: {
    ...Typography.sectionTitle,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ctaLabel: {
    ...Typography.label,
  },
});
