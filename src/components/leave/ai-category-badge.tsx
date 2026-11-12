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

export function AICategoryBadge({ ai, onRetry, isRetrying }: AICategoryBadgeProps) {
  const theme = useTheme();

  if (!ai) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surfaceSubtle }]}>
        <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
          Klasifikasi AI: Memproses...
        </Text>
      </View>
    );
  }

  const isFailed = ai.state === 'failed' || ai.state === 'timeout';
  const categoryLabel = ai.category || 'Tidak tersedia';
  const confidencePercent =
    typeof ai.confidence === 'number' ? ` (${Math.round(ai.confidence * 100)}%)` : '';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isFailed ? '#fef2f2' : '#f0fdf4',
          borderColor: isFailed ? '#fca5a5' : '#86efac',
        },
      ]}>
      <View style={styles.badgeRow}>
        <View style={styles.chip}>
          <Text
            style={[
              styles.chipText,
              { color: isFailed ? '#991b1b' : '#166534' },
            ]}>
            {isFailed ? '⚠️ Klasifikasi AI tidak tersedia' : `🤖 Kategori AI: ${categoryLabel}${confidencePercent}`}
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

      <Text style={[styles.disclaimer, { color: theme.textTertiary }]}>
        Prediksi otomatis sebagai informasi pendukung, bukan keputusan.
      </Text>
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
  disclaimer: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
