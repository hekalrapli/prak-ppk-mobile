// src/components/leave/ai-category-badge.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LeaveClassification } from '../../types/attendance';
import { Spacing, Typography } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { StatusDot, StatusTone } from '../ui/status-dot';

interface AICategoryBadgeProps {
  ai?: LeaveClassification;
  onRetry?: () => void;
  isRetrying?: boolean;
}

/**
 * Kategori kualitas alasan izin (informasi pendukung, bukan vonis):
 * - positif: alasan kuat & spesifik (sakit/rumah sakit, keluarga meninggal,
 *   lomba/seminar resmi, bencana) — dapat diverifikasi.
 * - netral: alasan umum/ambigu (keperluan/acara keluarga, urusan mendadak) —
 *   perlu klarifikasi.
 * - negatif: terindikasi menghindar (mager, malas, bolos, nongkrong, main game).
 * Kategori berasal dari analyzer izin; model-edom hanya sinyal sentimen sekunder.
 */
const CATEGORY_LABEL: Record<string, string> = {
  positif: 'Positif',
  netral: 'Netral',
  negatif: 'Negatif',
};

export function AICategoryBadge({ ai, onRetry, isRetrying }: AICategoryBadgeProps) {
  const theme = useTheme();

  if (!ai) {
    return (
      <View style={styles.container}>
        <StatusDot label="Klasifikasi AI belum tersedia" tone="muted" />
        {onRetry ? (
          <TouchableOpacity disabled={isRetrying} hitSlop={8} onPress={onRetry}>
            <Text style={[styles.action, { color: theme.primary }]}>
              {isRetrying ? 'Mencoba…' : 'Klasifikasi sekarang'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const isFailed = ai.state === 'failed' || ai.state === 'timeout';
  const tone: StatusTone = isFailed
    ? 'error'
    : ai.category === 'positif'
      ? 'success'
      : ai.category === 'negatif'
        ? 'warning'
        : 'neutral';

  const confidencePercent =
    !isFailed && typeof ai.confidence === 'number'
      ? ` (${Math.round(ai.confidence * 100)}%)`
      : '';

  const label = isFailed
    ? 'Klasifikasi AI tidak tersedia'
    : `Kategori AI: ${CATEGORY_LABEL[ai.category] ?? 'Netral'}${confidencePercent}`;

  return (
    <View style={styles.block}>
      <View style={styles.container}>
        <StatusDot label={label} tone={tone} />
        {isFailed && onRetry ? (
          <TouchableOpacity disabled={isRetrying} hitSlop={8} onPress={onRetry}>
            <Text style={[styles.action, { color: theme.primary }]}>
              {isRetrying ? 'Mencoba…' : 'Coba ulang'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
        Prediksi otomatis, bukan keputusan.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: Spacing.two,
    gap: Spacing.half,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  action: {
    ...Typography.caption,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  disclaimer: {
    ...Typography.caption,
  },
});
