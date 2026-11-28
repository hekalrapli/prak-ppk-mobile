import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SessionDateHeaderProps {
  date: string;
  count?: number;
  relativeLabel?: string | null;
  highlightTone?: 'open' | 'default';
}

/**
 * Judul kelompok tanggal di daftar jadwal/riwayat.
 * Menggunakan latar solid agar tetap terbaca bersih saat `stickySectionHeadersEnabled`.
 */
export function SessionDateHeader({
  date,
  count,
  relativeLabel,
  highlightTone = 'default',
}: SessionDateHeaderProps) {
  const theme = useTheme();
  const isOpenSection = highlightTone === 'open';
  const isTodayOrTomorrow = relativeLabel === 'Hari ini' || relativeLabel === 'Besok';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.leftRow}>
        {isOpenSection ? (
          <View style={[styles.openDot, { backgroundColor: theme.success }]} />
        ) : null}

        {relativeLabel ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isTodayOrTomorrow
                  ? theme.primarySoft
                  : theme.surfaceSubtle,
              },
            ]}>
            <Text
              style={[
                styles.badgeText,
                {
                  color: isTodayOrTomorrow ? theme.link : theme.textSecondary,
                },
              ]}>
              {relativeLabel}
            </Text>
          </View>
        ) : null}

        <Text
          numberOfLines={1}
          style={[
            styles.label,
            { color: isOpenSection ? theme.success : theme.textSecondary },
          ]}>
          {date}
        </Text>
      </View>

      {typeof count === 'number' && count > 0 ? (
        <Text style={[styles.count, { color: theme.textTertiary }]}>
          {count} sesi
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
    minWidth: 0,
  },
  openDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    flexShrink: 0,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  label: {
    ...Typography.label,
    flexShrink: 1,
  },
  count: {
    ...Typography.caption,
    flexShrink: 0,
    fontVariant: ['tabular-nums'],
  },
});
