// src/app/praktikan/fines/[fineId].tsx
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaymentStatusBadge } from '@/components/payments/payment-status-badge';
import { AppButton } from '@/components/ui/app-button';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { usePaymentHistory } from '@/hooks/use-payment-history';
import { useFineDetail } from '@/hooks/use-praktikan-fines';
import { useTheme } from '@/hooks/use-theme';
import { formatRupiah } from '@/services/labService';
import {
  createFinePaymentTransaction,
  isPaymentApiConfigured,
  verifyPaymentOrderStatus,
} from '@/services/paymentApi';
import {
  formatPaymentMethodLabel,
  formatTimestampDate,
  formatTimestampDateTimeWib,
} from '@/services/paymentDataService';
import { useAuth } from '@/store/auth-context';

export default function PraktikanFineDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { profile } = useAuth();
  const { fineId } = useLocalSearchParams<{ fineId?: string }>();

  const { fine, loading, error, retry } = useFineDetail(fineId);
  const { transactions } = usePaymentHistory(profile?.uid);

  const [creatingTx, setCreatingTx] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const busyRef = useRef(false);

  const fineTransactions = useMemo(
    () => transactions.filter((tx) => tx.fineId === fineId),
    [transactions, fineId]
  );

  const latestTransaction = fineTransactions[0] ?? null;
  const effectiveOrderId =
    activeOrderId ?? fine?.latestOrderId ?? latestTransaction?.orderId ?? null;
  const apiConfigured = isPaymentApiConfigured();

  const renderNotFound = () => (
    <DetailScreen title="Detail Tagihan">
      <View style={styles.fallback}>
        <EmptyState
          title="Tagihan tidak ditemukan"
          description="Data tagihan denda tidak tersedia atau Anda tidak memiliki akses ke tagihan ini."
          actionLabel="Kembali ke daftar tagihan"
          onAction={() => router.replace('/praktikan/fines')}
        />
      </View>
    </DetailScreen>
  );

  if (!fineId) {
    return renderNotFound();
  }

  if (loading) {
    return (
      <DetailScreen title="Detail Tagihan">
        <View style={styles.fallback}>
          <LoadingState label="Memuat detail tagihan…" />
        </View>
      </DetailScreen>
    );
  }

  if (error) {
    return (
      <DetailScreen title="Detail Tagihan">
        <View style={styles.fallback}>
          <ErrorState message={error} onRetry={retry} />
        </View>
      </DetailScreen>
    );
  }

  if (!fine) {
    return renderNotFound();
  }

  const handlePayNow = async () => {
    if (busyRef.current || fine.status === 'success') {
      return;
    }

    busyRef.current = true;
    setCreatingTx(true);
    try {
      const tx = await createFinePaymentTransaction(fine.id);
      setActiveOrderId(tx.orderId);
      setAwaitingVerification(true);

      await WebBrowser.openBrowserAsync(tx.redirectUrl, {
        enableBarCollapsing: true,
        showTitle: true,
      });

      // ATURAN WAJIB SPRINT 4: Jangan pernah menandai lunas dari penutupan browser client.
      // Status hanya ditentukan dari verifikasi webhook / server-to-server Midtrans.
      showToast(
        'Menunggu verifikasi pembayaran dari Midtrans. Status diperbarui otomatis.',
        'success'
      );
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : 'Gagal memulai transaksi pembayaran Midtrans.',
        'error'
      );
    } finally {
      busyRef.current = false;
      setCreatingTx(false);
    }
  };

  const handleResumePendingPage = async () => {
    const pendingUrl = latestTransaction?.redirectUrl;
    if (!pendingUrl || busyRef.current) {
      return;
    }

    busyRef.current = true;
    try {
      setAwaitingVerification(true);
      await WebBrowser.openBrowserAsync(pendingUrl, {
        enableBarCollapsing: true,
        showTitle: true,
      });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal membuka halaman pembayaran.',
        'error'
      );
    } finally {
      busyRef.current = false;
    }
  };

  const handleCheckStatus = async () => {
    if (!effectiveOrderId || busyRef.current) {
      return;
    }

    busyRef.current = true;
    setCheckingStatus(true);
    try {
      const result = await verifyPaymentOrderStatus(effectiveOrderId);
      if (result.status === 'success') {
        setAwaitingVerification(false);
        showToast('Pembayaran denda berhasil diverifikasi!', 'success');
      } else if (result.status === 'failed') {
        setAwaitingVerification(false);
        showToast(
          'Pembayaran gagal atau kedaluwarsa. Anda dapat mencoba bayar ulang.',
          'error'
        );
      } else {
        showToast(
          'Status masih menunggu pembayaran di Midtrans Sandbox.',
          'success'
        );
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal memeriksa status pembayaran.',
        'error'
      );
    } finally {
      busyRef.current = false;
      setCheckingStatus(false);
    }
  };

  const isSuccess = fine.status === 'success';
  const isPending = fine.status === 'pending';
  const isFailed = fine.status === 'failed';
  const canResumePending =
    isPending &&
    latestTransaction?.status === 'pending' &&
    Boolean(latestTransaction.redirectUrl);

  return (
    <DetailScreen title="Detail Tagihan">
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
        ]}>
        <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

        <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
          <View
            style={[
              styles.card,
              Shadow.soft,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}>
            <View style={styles.topRow}>
              <Text style={[styles.caption, { color: theme.textSecondary }]}>
                Nominal Denda Tetap
              </Text>
              <PaymentStatusBadge status={fine.status} verbose />
            </View>

            <Text style={[styles.amountHero, { color: theme.textPrimary }]}>
              {formatRupiah(fine.amount)}
            </Text>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <DetailRow label="Praktikum" value={fine.practicumName} />
            <DetailRow label="Tanggal sesi" value={fine.sessionDate || '—'} />
            <DetailRow label="Laboratorium" value={fine.labName || '—'} />
            <DetailRow
              label="Keterlambatan"
              value={`+${fine.lateMinutes} menit (toleransi ${fine.gracePeriodMinutes} mnt)`}
            />
            <DetailRow
              label="Tanggal tagihan"
              value={formatTimestampDate(fine.createdAt)}
            />
            {isSuccess && fine.paidAt ? (
              <DetailRow
                label="Waktu lunas"
                value={formatTimestampDateTimeWib(fine.paidAt)}
              />
            ) : null}
          </View>

          <View style={[styles.noticeBox, { backgroundColor: theme.surfaceSubtle }]}>
            <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
              Pembayaran denda hanya menyelesaikan kewajiban administrasi keterlambatan
              dan tidak mengubah status kehadiran Anda pada rekap praktikum.
            </Text>
          </View>

          {isSuccess ? (
            <View
              style={[
                styles.statusCard,
                { backgroundColor: theme.successSoft, borderColor: theme.success },
              ]}>
              <Text style={[styles.statusTitle, { color: theme.success }]}>
                Tagihan Denda Lunas
              </Text>
              <Text style={[styles.statusBody, { color: theme.textPrimary }]}>
                Pembayaran telah diverifikasi oleh Midtrans Sandbox. Terima kasih telah
                menyelesaikan tagihan denda Anda.
              </Text>
              <AppButton
                label="Lihat Riwayat Pembayaran"
                onPress={() => router.push('/praktikan/payments')}
                variant="secondary"
              />
            </View>
          ) : (
            <View
              style={[
                styles.card,
                Shadow.soft,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Pembayaran Midtrans Sandbox
              </Text>

              {!apiConfigured ? (
                <View style={[styles.alertBox, { backgroundColor: theme.warningSoft }]}>
                  <Text style={[styles.alertText, { color: theme.warning }]}>
                    Server backend pembayaran belum dikonfigurasi
                    (`EXPO_PUBLIC_PAYMENT_API_URL`). Hubungi admin atau deploy backend
                    terlebih dahulu.
                  </Text>
                </View>
              ) : null}

              {isPending || awaitingVerification ? (
                <View style={[styles.alertBox, { backgroundColor: theme.warningSoft }]}>
                  <Text style={[styles.alertText, { color: theme.warning }]}>
                    Menunggu verifikasi pembayaran dari Midtrans Sandbox. Status akan
                    diperbarui otomatis setelah webhook diterima, atau tekan &quot;Periksa
                    Status&quot; di bawah.
                  </Text>
                </View>
              ) : null}

              {isFailed ? (
                <View style={[styles.alertBox, { backgroundColor: theme.errorSoft }]}>
                  <Text style={[styles.alertText, { color: theme.error }]}>
                    Transaksi sebelumnya gagal atau kedaluwarsa. Silakan buat transaksi
                    baru untuk membayar ulang.
                  </Text>
                </View>
              ) : null}

              <View style={styles.buttonStack}>
                {canResumePending ? (
                  <AppButton
                    disabled={creatingTx || checkingStatus}
                    label="Lanjutkan Pembayaran"
                    onPress={() => {
                      void handleResumePendingPage();
                    }}
                  />
                ) : (
                  <AppButton
                    disabled={!apiConfigured || checkingStatus}
                    label={
                      isFailed
                        ? 'Bayar Ulang'
                        : isPending
                          ? 'Buat Transaksi Baru'
                          : 'Bayar Sekarang'
                    }
                    loading={creatingTx}
                    onPress={() => {
                      void handlePayNow();
                    }}
                  />
                )}

                {effectiveOrderId ? (
                  <AppButton
                    disabled={!apiConfigured || creatingTx}
                    label="Periksa Status Pembayaran"
                    loading={checkingStatus}
                    onPress={() => {
                      void handleCheckStatus();
                    }}
                    variant="secondary"
                  />
                ) : null}

                {canResumePending ? (
                  <AppButton
                    disabled={!apiConfigured || checkingStatus}
                    label="Buat Transaksi Baru"
                    loading={creatingTx}
                    onPress={() => {
                      void handlePayNow();
                    }}
                    variant="secondary"
                  />
                ) : null}
              </View>
            </View>
          )}

          {fineTransactions.length > 0 ? (
            <View
              style={[
                styles.card,
                Shadow.soft,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Percobaan Pembayaran ({fineTransactions.length})
              </Text>

              <View style={styles.txList}>
                {fineTransactions.map((tx) => (
                  <View
                    key={tx.orderId}
                    style={[
                      styles.txItem,
                      {
                        backgroundColor: theme.surfaceSubtle,
                        borderColor: theme.border,
                      },
                    ]}>
                    <View style={styles.topRow}>
                      <Text
                        numberOfLines={1}
                        style={[styles.txOrderId, { color: theme.textPrimary }]}>
                        {tx.orderId}
                      </Text>
                      <PaymentStatusBadge status={tx.status} />
                    </View>
                    <Text style={[styles.caption, { color: theme.textSecondary }]}>
                      {formatPaymentMethodLabel(tx.paymentType)} ·{' '}
                      {formatRupiah(tx.amount)}
                    </Text>
                    <Text style={[styles.caption, { color: theme.textTertiary }]}>
                      {formatTimestampDateTimeWib(tx.paidAt ?? tx.createdAt)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </DetailScreen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: theme.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fallback: { flex: 1, justifyContent: 'center', padding: Spacing.three },
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
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  amountHero: {
    ...Typography.display,
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    marginVertical: Spacing.one,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  detailLabel: { ...Typography.caption, flexShrink: 0 },
  detailValue: {
    ...Typography.caption,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  noticeBox: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  noticeText: { ...Typography.caption, lineHeight: 18 },
  statusCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  statusTitle: { ...Typography.cardTitle, fontWeight: '700' },
  statusBody: { ...Typography.body },
  sectionTitle: { ...Typography.cardTitle },
  alertBox: {
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  alertText: { ...Typography.caption, fontWeight: '600', lineHeight: 18 },
  buttonStack: { gap: Spacing.two, marginTop: Spacing.one },
  txList: { gap: Spacing.two },
  txItem: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.three,
    gap: 3,
  },
  txOrderId: {
    ...Typography.caption,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
  },
  caption: { ...Typography.caption },
});
