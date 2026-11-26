import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusDot, type StatusTone } from '@/components/ui/status-dot';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatRupiah } from '@/lib/lateness';
import type { FineFinancialSummary } from '@/services/fineService';
import type { FineDoc, FineStatus } from '@/types/attendance';

interface FinanceSummaryCardProps {
  summary: FineFinancialSummary;
}

const STATUS_CONFIG: Record<
  FineStatus,
  { label: string; tone: StatusTone }
> = {
  success: { label: 'Lunas', tone: 'success' },
  unpaid: { label: 'Belum bayar', tone: 'error' },
  pending: { label: 'Menunggu', tone: 'warning' },
  failed: { label: 'Gagal', tone: 'error' },
};

export function FinanceSummaryCard({ summary }: FinanceSummaryCardProps) {
  const theme = useTheme();
  const [showAll, setShowAll] = useState(false);

  const displayedFines = showAll
    ? summary.fines
    : summary.fines.slice(0, 5);

  return (
    <View
      style={[
        styles.container,
        Shadow.soft,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Ringkasan Keuangan Denda
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Hasil akumulasi denda keterlambatan praktikum
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: theme.surfaceSubtle }]}>
          <Text style={[styles.badgeText, { color: theme.textSecondary }]}>
            {summary.totalFineEvents} Pelanggaran
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme.successSoft }]}>
          <Text style={[styles.statBoxLabel, { color: theme.success }]}>
            Terkumpul (Lunas)
          </Text>
          <Text style={[styles.statBoxValue, { color: theme.success }]}>
            {formatRupiah(summary.totalCollected)}
          </Text>
          <Text style={[styles.statBoxSub, { color: theme.textSecondary }]}>
            {summary.successCount} transaksi sukses
          </Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.warningSoft }]}>
          <Text style={[styles.statBoxLabel, { color: theme.warning }]}>
            Tertunggak / Menunggu
          </Text>
          <Text style={[styles.statBoxValue, { color: theme.warning }]}>
            {formatRupiah(summary.totalPending)}
          </Text>
          <Text style={[styles.statBoxSub, { color: theme.textSecondary }]}>
            {summary.unpaidCount} belum dibayar
          </Text>
        </View>
      </View>

      <View style={styles.listSection}>
        <Text style={[styles.listHeader, { color: theme.textPrimary }]}>
          Riwayat Tagihan Keterlambatan
        </Text>

        {summary.fines.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.surfaceSubtle }]}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Tidak ada catatan denda keterlambatan pada periode ini.
            </Text>
          </View>
        ) : (
          <View style={styles.fineList}>
            {displayedFines.map((fine: FineDoc) => {
              const statusCfg = STATUS_CONFIG[fine.status] ?? STATUS_CONFIG.unpaid;
              return (
                <View
                  key={fine.id}
                  style={[
                    styles.fineItem,
                    { borderBottomColor: theme.border },
                  ]}>
                  <View style={styles.fineItemInfo}>
                    <Text
                      numberOfLines={1}
                      style={[styles.fineItemName, { color: theme.textPrimary }]}>
                      {fine.praktikanName}
                    </Text>
                    <Text style={[styles.fineItemMeta, { color: theme.textSecondary }]}>
                      {fine.praktikanNim} · {fine.practicumName}
                    </Text>
                    <Text style={[styles.fineItemTime, { color: theme.textTertiary }]}>
                      Terlambat {fine.lateMinutes} mnt · {fine.sessionDate}
                    </Text>
                  </View>

                  <View style={styles.fineItemEnd}>
                    <Text style={[styles.fineItemAmount, { color: theme.textPrimary }]}>
                      {formatRupiah(fine.amount)}
                    </Text>
                    <StatusDot label={statusCfg.label} tone={statusCfg.tone} />
                  </View>
                </View>
              );
            })}

            {summary.fines.length > 5 ? (
              <Pressable
                onPress={() => setShowAll((prev) => !prev)}
                style={({ pressed }) => [
                  styles.toggleButton,
                  pressed && { opacity: 0.7 },
                ]}>
                <Text style={[styles.toggleButtonText, { color: theme.primary }]}>
                  {showAll
                    ? 'Sembunyikan'
                    : `Lihat semua (${summary.fines.length} tagihan)`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.bodyStrong,
    fontSize: 16,
  },
  subtitle: {
    ...Typography.caption,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.full,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statBox: {
    flex: 1,
    borderRadius: Radius.card,
    padding: Spacing.two,
    gap: 2,
  },
  statBoxLabel: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  statBoxValue: {
    ...Typography.bodyStrong,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  statBoxSub: {
    ...Typography.caption,
    fontSize: 11,
  },
  listSection: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  listHeader: {
    ...Typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyBox: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  fineList: {
    gap: 0,
  },
  fineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  fineItemInfo: {
    flex: 1,
    gap: 2,
  },
  fineItemName: {
    ...Typography.bodyStrong,
    fontSize: 14,
  },
  fineItemMeta: {
    ...Typography.caption,
  },
  fineItemTime: {
    ...Typography.caption,
    fontSize: 11,
  },
  fineItemEnd: {
    alignItems: 'flex-end',
    gap: Spacing.half,
  },
  fineItemAmount: {
    ...Typography.bodyStrong,
    fontVariant: ['tabular-nums'],
    fontSize: 13,
  },
  toggleButton: {
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  toggleButtonText: {
    ...Typography.bodyStrong,
    fontSize: 13,
  },
});
