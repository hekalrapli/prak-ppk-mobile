// src/app/praktikan/payments/index.tsx
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
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import {
  SegmentedControl,
  type SegmentOption,
} from '@/components/ui/segmented-control';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { usePaymentHistory } from '@/hooks/use-payment-history';
import { useTheme } from '@/hooks/use-theme';
import { formatRupiah } from '@/services/labService';
import {
  formatPaymentMethodLabel,
  formatTimestampDate,
  formatTimestampDateTimeWib,
} from '@/services/paymentDataService';
import { useAuth } from '@/store/auth-context';
import type { PaymentTransactionDoc } from '@/types/attendance';

type PaymentFilter = 'all' | 'pending' | 'success' | 'failed';

/**
 * FR-S4-P3-04: Halaman Riwayat Pembayaran Persisten Praktikan.
 * Bersumber real-time dari koleksi Firestore `paymentTransactions` sehingga
 * tetap tersedia meski aplikasi ditutup penuh (force close) dan dibuka kembali.
 */
export default function PraktikanPaymentHistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { transactions, counts, loading, refreshing, error, retry, refresh } =
    usePaymentHistory(profile?.uid);

  const [filter, setFilter] = useState<PaymentFilter>('all');

  const filterOptions = useMemo<SegmentOption<PaymentFilter>[]>(
    () => [
      { value: 'all', label: 'Semua', count: counts.all },
      { value: 'pending', label: 'Menunggu', count: counts.pending },
      { value: 'success', label: 'Berhasil', count: counts.success },
      { value: 'failed', label: 'Gagal', count: counts.failed },
    ],
    [counts.all, counts.pending, counts.success, counts.failed]
  );

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter((tx) => tx.status === filter);
  }, [transactions, filter]);

  const openFine = (tx: PaymentTransactionDoc) => {
    if (!tx.fineId) return;
    router.push({
      pathname: '/praktikan/fines/[fineId]',
      params: { fineId: tx.fineId },
    });
  };

  return (
    <DetailScreen title="Riwayat Pembayaran">
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
            data={filteredTransactions}
            keyExtractor={(item) => item.orderId}
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
              transactions.length > 0 ? (
                <View style={styles.headerBlock}>
                  <SegmentedControl
                    onChange={setFilter}
                    options={filterOptions}
                    value={filter}
                  />
                </View>
              ) : undefined
            }
            ListEmptyComponent={
              transactions.length === 0 ? (
                <EmptyState
                  title="Belum ada riwayat pembayaran"
                  description="Seluruh transaksi pembayaran denda melalui Midtrans Sandbox akan tersimpan di sini secara permanen."
                  actionLabel="Lihat tagihan denda"
                  onAction={() => router.push('/praktikan/fines')}
                />
              ) : (
                <EmptyState
                  title="Tidak ada transaksi pada kategori ini"
                  description="Pilih tab status lain untuk melihat seluruh riwayat pembayaran Anda."
                  actionLabel="Tampilkan semua"
                  onAction={() => setFilter('all')}
                />
              )
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityLabel={`Transaksi ${item.practicumName}, ${formatRupiah(item.amount)}`}
                accessibilityRole="button"
                onPress={() => openFine(item)}
                style={({ pressed }) => [
                  styles.card,
                  Shadow.soft,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
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

                <InfoLine
                  label="Sesi praktikum"
                  value={item.sessionDate || '—'}
                />
                <InfoLine
                  label="Tanggal tagihan"
                  value={formatTimestampDate(item.fineCreatedAt)}
                />
                <InfoLine
                  label="Waktu transaksi"
                  value={formatTimestampDateTimeWib(item.paidAt ?? item.createdAt)}
                />
                <InfoLine
                  label="Metode / Order"
                  value={`${formatPaymentMethodLabel(item.paymentType)} · ${item.orderId}`}
                />

                <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                  <Text style={[styles.amount, { color: theme.textPrimary }]}>
                    {formatRupiah(item.amount)}
                  </Text>
                  {item.fineId ? (
                    <View style={styles.ctaRow}>
                      <Text style={[styles.ctaLabel, { color: theme.link }]}>
                        {item.status === 'failed'
                          ? 'Bayar ulang'
                          : item.status === 'pending'
                            ? 'Periksa status'
                            : 'Detail tagihan'}
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
                  ) : null}
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
    </DetailScreen>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.infoValue, { color: theme.textPrimary }]}>
        {value}
      </Text>
    </View>
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
  headerBlock: { gap: Spacing.two },
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
    marginBottom: Spacing.one,
  },
  cardTitle: {
    ...Typography.cardTitle,
    flex: 1,
    minWidth: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  infoLabel: { ...Typography.caption, flexShrink: 0 },
  infoValue: {
    ...Typography.caption,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
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
  ctaLabel: { ...Typography.label },
});
