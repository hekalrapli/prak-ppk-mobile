// src/components/location/presence-distance-card.tsx
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDistanceMeters } from '@/lib/format-distance';

interface PresenceDistanceCardProps {
  distanceMeters: number | null;
  radiusMeters: number;
  insideRadius: boolean;
  loading?: boolean;
  accuracyMeters?: number | null;
}

/**
 * FR-P1-02: indikator jarak live "Jarak Anda: 18 m / Maks 50 m" dengan badge
 * hijau (dalam radius) atau merah (di luar radius).
 */
export function PresenceDistanceCard({
  distanceMeters,
  radiusMeters,
  insideRadius,
  loading = false,
  accuracyMeters = null,
}: PresenceDistanceCardProps) {
  const theme = useTheme();

  const numericDistance =
    typeof distanceMeters === 'number' && Number.isFinite(distanceMeters)
      ? distanceMeters
      : null;
  const hasDistance = numericDistance !== null;
  const tone = !hasDistance ? theme.textSecondary : insideRadius ? theme.success : theme.error;
  const badgeBackground = !hasDistance
    ? theme.surfaceSubtle
    : insideRadius
      ? theme.successSoft
      : theme.errorSoft;

  const badgeLabel = loading
    ? 'Membaca lokasi…'
    : !hasDistance
      ? 'Menunggu lokasi'
      : insideRadius
        ? 'Dalam radius'
        : 'Di luar radius';

  const progress =
    numericDistance !== null && radiusMeters > 0
      ? Math.min(numericDistance / radiusMeters, 1)
      : 0;

  return (
    <View
      accessibilityLabel={
        numericDistance !== null
          ? `Jarak Anda ${formatDistanceMeters(numericDistance)} dari maksimal ${formatDistanceMeters(radiusMeters)}. ${badgeLabel}.`
          : 'Jarak belum tersedia'
      }
      style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Jarak Anda</Text>
        <View style={[styles.badge, { backgroundColor: badgeBackground }]}>
          <Text style={[styles.badgeLabel, { color: tone }]}>{badgeLabel}</Text>
        </View>
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: theme.textPrimary }]}>
          {numericDistance !== null ? formatDistanceMeters(numericDistance) : '—'}
        </Text>
        <Text style={[styles.limit, { color: theme.textSecondary }]}>
          / Maks {formatDistanceMeters(radiusMeters)}
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: theme.surfaceSubtle }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.max(progress * 100, hasDistance ? 2 : 0)}%`,
              backgroundColor: tone,
            },
          ]}
        />
      </View>

      {accuracyMeters !== null && Number.isFinite(accuracyMeters) ? (
        <Text style={[styles.caption, { color: theme.textTertiary }]}>
          Akurasi GPS ±{Math.round(accuracyMeters)} m. Jarak dihitung dari titik
          laboratorium.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  label: { ...Typography.label },
  badge: {
    borderRadius: Radius.pill,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  badgeLabel: { ...Typography.caption, fontWeight: '700' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one },
  value: {
    ...Typography.display,
    fontSize: 34,
    lineHeight: 42,
    fontVariant: ['tabular-nums'],
  },
  limit: { ...Typography.bodyStrong },
  track: {
    height: 8,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: Radius.pill },
  caption: { ...Typography.caption },
});
