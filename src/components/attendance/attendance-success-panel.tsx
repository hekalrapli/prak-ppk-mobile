import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PunctualityStatus } from '@/types/attendance';

interface AttendanceSuccessPanelProps {
  recordedAt: string;
  punctualityStatus?: PunctualityStatus;
  lateMinutes?: number;
  fineAmount?: number;
}

export function AttendanceSuccessPanel({
  recordedAt,
  punctualityStatus,
  lateMinutes,
  fineAmount,
}: AttendanceSuccessPanelProps) {
  const theme = useTheme();

  const isLate = punctualityStatus === 'late';
  const panelBg = isLate ? theme.warningSoft : theme.successSoft;
  const badgeBg = isLate ? theme.warning : theme.success;
  const textColor = isLate ? theme.warning : theme.success;

  const title = isLate
    ? `Presensi Tercatat (Terlambat +${lateMinutes ?? 1} mnt)`
    : 'Kehadiran sudah dicatat (Tepat Waktu)';

  return (
    <View
      accessibilityLabel={`Kehadiran sudah dicatat pukul ${recordedAt}${isLate ? `, terlambat ${lateMinutes} menit` : ''}`}
      style={[styles.panel, { backgroundColor: panelBg }]}>
      <View style={[styles.check, { backgroundColor: badgeBg }]}>
        <Text style={[styles.checkLabel, { color: theme.background }]}>
          {isLate ? '!' : '✓'}
        </Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: textColor }]}>
          {title}
        </Text>
        <Text style={[styles.time, { color: theme.textPrimary }]}>
          Pukul {recordedAt}
        </Text>
        {isLate && typeof fineAmount === 'number' && fineAmount > 0 ? (
          <Text style={[styles.fineNotice, { color: theme.error }]}>
            Tagihan denda keterlambatan: Rp {fineAmount.toLocaleString('id-ID')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    borderRadius: Radius.card,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLabel: { fontSize: 18, fontWeight: '700', lineHeight: 22 },
  body: { flex: 1, gap: Spacing.half },
  title: { ...Typography.bodyStrong },
  time: {
    ...Typography.bodyStrong,
    fontVariant: ['tabular-nums'],
  },
  fineNotice: {
    ...Typography.caption,
    fontWeight: '600',
    marginTop: 2,
  },
});
