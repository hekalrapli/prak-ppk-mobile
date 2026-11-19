// src/components/maps/lab-map-view.web.tsx
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDistanceMeters } from '@/lib/format-distance';
import { distanceToLaboratory } from '@/services/locationService';
import type { LabMapViewProps } from './lab-map-view.types';

/**
 * FR-P1-03 fallback untuk web.
 *
 * react-native-maps tidak mendukung web, sehingga target web menampilkan daftar
 * laboratorium dengan informasi yang setara (nama, gedung, radius, jarak, dan
 * status pilihan). Dengan begitu `expo export --platform web` tetap berhasil
 * dan seluruh alur lain (presensi, status sesi) dapat diuji di browser.
 */
export function LabMapView({
  laboratories,
  selectedLabId,
  userPosition,
  onSelectLaboratory,
}: LabMapViewProps) {
  const theme = useTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={[styles.scroll, { backgroundColor: theme.background }]}>
      <View style={[styles.notice, { backgroundColor: theme.surfaceSubtle }]}>
        <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
          Peta interaktif tersedia di aplikasi mobile (iOS/Android). Di web, daftar
          laboratorium berikut menampilkan informasi yang sama.
        </Text>
      </View>

      {laboratories.length === 0 ? (
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.name, { color: theme.textPrimary }]}>
            Belum ada laboratorium
          </Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            Asisten belum menambahkan titik laboratorium. Data akan muncul otomatis
            setelah ditambahkan.
          </Text>
        </View>
      ) : null}

      {laboratories.map((laboratory) => {
        const selected = laboratory.id === selectedLabId;
        const distance = userPosition
          ? distanceToLaboratory(userPosition, laboratory)
          : null;
        const insideRadius =
          distance !== null &&
          laboratory.radiusMeter > 0 &&
          distance <= laboratory.radiusMeter;

        return (
          <Pressable
            key={laboratory.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelectLaboratory(laboratory)}
            style={({ pressed }) => [
              styles.card,
              Shadow.soft,
              {
                backgroundColor: theme.surface,
                borderColor: selected ? theme.primary : theme.border,
                opacity: pressed ? 0.9 : 1,
              },
            ]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.name, { color: theme.textPrimary }]}>
                {laboratory.name}
              </Text>
              {selected ? (
                <Text style={[styles.selected, { color: theme.primary }]}>Dipilih</Text>
              ) : null}
            </View>

            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {laboratory.building || 'Gedung belum diisi'}
            </Text>

            <View style={styles.rowBetween}>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                {laboratory.radiusMeter > 0
                  ? `Radius ${laboratory.radiusMeter} m`
                  : 'Radius belum diatur'}
              </Text>
              <Text
                style={[
                  styles.distance,
                  {
                    color:
                      distance === null
                        ? theme.textTertiary
                        : insideRadius
                          ? theme.success
                          : theme.error,
                  },
                ]}>
                {distance === null
                  ? 'Lokasi tidak aktif'
                  : `${formatDistanceMeters(distance)} dari Anda`}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  notice: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  noticeText: { ...Typography.caption, lineHeight: 18 },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: { ...Typography.cardTitle, flexShrink: 1 },
  selected: { ...Typography.caption, fontWeight: '700' },
  meta: { ...Typography.caption },
  distance: { ...Typography.caption, fontWeight: '600' },
});
