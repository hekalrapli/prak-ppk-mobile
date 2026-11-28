// src/components/payments/payment-status-badge.tsx
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FineStatus, PaymentTransactionStatus } from '@/types/attendance';

type BadgeStatus = FineStatus | PaymentTransactionStatus;

const LABELS: Record<BadgeStatus, string> = {
  unpaid: 'Belum Dibayar',
  pending: 'Menunggu',
  success: 'Berhasil',
  failed: 'Gagal',
};

interface PaymentStatusBadgeProps {
  status: BadgeStatus;
  /** Gunakan label panjang untuk detail tagihan (mis. "Menunggu Pembayaran"). */
  verbose?: boolean;
}

export function PaymentStatusBadge({
  status,
  verbose = false,
}: PaymentStatusBadgeProps) {
  const theme = useTheme();

  const label =
    verbose && status === 'pending' ? 'Menunggu Pembayaran' : LABELS[status];

  const palette =
    status === 'success'
      ? {
          bg: theme.successSoft,
          fg: theme.success,
          dot: theme.success,
        }
      : status === 'pending'
        ? {
            bg: theme.warningSoft,
            fg: theme.warning,
            dot: theme.warning,
          }
        : status === 'failed'
          ? {
              bg: theme.errorSoft,
              fg: theme.error,
              dot: theme.error,
            }
          : {
              bg: theme.primarySoft,
              fg: theme.link,
              dot: theme.link,
            };

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.text, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    flexShrink: 0,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: Radius.full,
  },
  text: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
