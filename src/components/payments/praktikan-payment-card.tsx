// src/components/payments/praktikan-payment-card.tsx
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRupiah } from '@/services/labService';

interface UnpaidFineBannerProps {
  actionableCount: number;
  totalOutstandingAmount: number;
}

/**
 * Banner ringkas pada tab Jadwal Praktikan; hanya tampil ketika ada tagihan denda aktif.
 */
export function UnpaidFineBanner({
  actionableCount,
  totalOutstandingAmount,
}: UnpaidFineBannerProps) {
  const router = useRouter();
  const theme = useTheme();

  if (actionableCount <= 0) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel={`Ada ${actionableCount} tagihan denda aktif sebesar ${formatRupiah(totalOutstandingAmount)}. Ketuk untuk membayar.`}
      accessibilityRole="button"
      onPress={() => router.push('/praktikan/fines')}
      style={({ pressed }) => [
        styles.banner,
        Shadow.soft,
        {
          backgroundColor: theme.warningSoft,
          borderColor: theme.warning,
          opacity: pressed ? 0.88 : 1,
        },
      ]}>
      <View style={styles.bannerInfo}>
        <Text style={[styles.bannerTitle, { color: theme.warning }]}>
          {actionableCount} Tagihan Denda Belum Lunas
        </Text>
        <Text style={[styles.bannerSub, { color: theme.textPrimary }]}>
          Total {formatRupiah(totalOutstandingAmount)} · Ketuk untuk bayar via Midtrans
        </Text>
      </View>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={18}
        tintColor={theme.warning}
      />
    </Pressable>
  );
}

interface PaymentQuickLinksCardProps {
  actionableCount: number;
  totalOutstandingAmount: number;
  compact?: boolean;
}

/**
 * Kartu akses cepat Tagihan Denda & Riwayat Pembayaran untuk tab Riwayat dan Profil Praktikan.
 */
export function PaymentQuickLinksCard({
  actionableCount,
  totalOutstandingAmount,
  compact = false,
}: PaymentQuickLinksCardProps) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        Shadow.soft,
        compact && styles.cardCompact,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}>
      {!compact ? (
        <Text style={[styles.cardHeader, { color: theme.textPrimary }]}>
          Tagihan & Pembayaran
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/praktikan/fines')}
        style={({ pressed }) => [
          styles.linkRow,
          pressed && { opacity: 0.78 },
        ]}>
        <View style={styles.linkTextWrap}>
          <Text style={[styles.linkTitle, { color: theme.textPrimary }]}>
            Tagihan Denda
          </Text>
          <Text numberOfLines={1} style={[styles.linkMeta, { color: theme.textSecondary }]}>
            {actionableCount > 0
              ? `${actionableCount} tagihan aktif · ${formatRupiah(totalOutstandingAmount)}`
              : 'Tidak ada tagihan belum lunas'}
          </Text>
        </View>

        <View style={styles.linkRight}>
          {actionableCount > 0 ? (
            <View style={[styles.countPill, { backgroundColor: theme.primary }]}>
              <Text style={[styles.countPillText, { color: theme.onPrimary }]}>
                {actionableCount}
              </Text>
            </View>
          ) : null}
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={18}
            tintColor={theme.textSecondary}
          />
        </View>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/praktikan/payments')}
        style={({ pressed }) => [
          styles.linkRow,
          pressed && { opacity: 0.78 },
        ]}>
        <View style={styles.linkTextWrap}>
          <Text style={[styles.linkTitle, { color: theme.textPrimary }]}>
            Riwayat Pembayaran
          </Text>
          <Text numberOfLines={1} style={[styles.linkMeta, { color: theme.textSecondary }]}>
            Lihat seluruh transaksi Midtrans yang tersimpan
          </Text>
        </View>

        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={18}
          tintColor={theme.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.two,
  },
  bannerInfo: { flex: 1, minWidth: 0, gap: 2 },
  bannerTitle: { ...Typography.label, fontWeight: '700' },
  bannerSub: { ...Typography.caption },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardCompact: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: { ...Typography.cardTitle, marginBottom: Spacing.half },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 48,
    paddingVertical: Spacing.one,
  },
  linkTextWrap: { flex: 1, minWidth: 0, gap: 2 },
  linkTitle: { ...Typography.bodyStrong },
  linkMeta: { ...Typography.caption },
  linkRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 0,
  },
  countPill: {
    minWidth: 24,
    height: 24,
    borderRadius: Radius.pill,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPillText: {
    ...Typography.caption,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  divider: { height: 1 },
});
