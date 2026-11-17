// src/components/leave/ai-category-badge.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LeaveClassification } from '../../types/attendance';
import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

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
const CATEGORY_META: Record<
  string,
  { displayName: string; backgroundColor: string; borderColor: string; textColor: string }
> = {
  positif: {
    displayName: 'Positif',
    backgroundColor: '#dcfce7',
    borderColor: '#86efac',
    textColor: '#166534',
  },
  netral: {
    displayName: 'Netral',
    backgroundColor: '#e0f2fe',
    borderColor: '#7dd3fc',
    textColor: '#075985',
  },
  negatif: {
    displayName: 'Negatif',
    backgroundColor: '#fef3c7',
    borderColor: '#fcd34d',
    textColor: '#92400e',
  },
};

const FAILED_META = {
  displayName: 'Tidak tersedia',
  backgroundColor: '#fef2f2',
  borderColor: '#fca5a5',
  textColor: '#991b1b',
};

export function AICategoryBadge({ ai, onRetry, isRetrying }: AICategoryBadgeProps) {
  const theme = useTheme();

  if (!ai) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surfaceSubtle }]}>
        <View style={styles.badgeRow}>
          <Text style={[styles.chipText, { color: theme.textSecondary }]}>
            Klasifikasi AI belum tersedia
          </Text>
          {onRetry ? (
            <TouchableOpacity
              style={styles.retryNeutralButton}
              onPress={onRetry}
              disabled={isRetrying}>
              <Text style={styles.retryNeutralText}>
                {isRetrying ? 'Mencoba...' : 'Klasifikasi sekarang'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  const isFailed = ai.state === 'failed' || ai.state === 'timeout';
  const meta = isFailed ? FAILED_META : CATEGORY_META[ai.category] ?? CATEGORY_META.netral;
  const confidencePercent =
    !isFailed && typeof ai.confidence === 'number' ? ` (${Math.round(ai.confidence * 100)}%)` : '';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: meta.backgroundColor,
          borderColor: meta.borderColor,
        },
      ]}>
      <View style={styles.badgeRow}>
        <View style={styles.chip}>
          <Text style={[styles.chipText, { color: meta.textColor }]}>
            {isFailed
              ? '⚠️ Klasifikasi AI tidak tersedia'
              : `🤖 Kategori AI: ${meta.displayName}${confidencePercent}`}
          </Text>
        </View>

        {isFailed && onRetry && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            disabled={isRetrying}>
            <Text style={styles.retryText}>
              {isRetrying ? 'Mencoba...' : 'Coba ulang'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginTop: Spacing.two,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  retryText: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '600',
  },
  retryNeutralButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  retryNeutralText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
});
