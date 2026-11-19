// src/components/maps/lab-map-screen.tsx
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { LoadingState } from '@/components/ui/screen-state';
import { TabScreen } from '@/components/ui/tab-screen';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useDevicePosition } from '@/hooks/use-device-position';
import { useLaboratories } from '@/hooks/use-laboratories';
import { useTheme } from '@/hooks/use-theme';
import { formatDistanceMeters } from '@/lib/format-distance';
import { distanceToLaboratory } from '@/services/locationService';
import type { DevicePosition, Laboratory, LocationIssue } from '@/types/location';
import { LabMapView } from './lab-map-view';

type MapIssue =
  | { kind: 'permission'; action: 'request' | 'settings' }
  | { kind: 'gps'; action: 'retry' | 'settings' }
  | { kind: 'mocked' }
  | { kind: 'timeout' };

const ISSUE_COPY: Record<MapIssue['kind'], string> = {
  permission: 'Lokasi belum aktif. Aktifkan agar posisi Anda tampil di peta.',
  gps: 'GPS tidak aktif atau tidak merespons.',
  mocked: 'Lokasi palsu terdeteksi. Posisi mungkin tidak akurat.',
  timeout: 'Sinyal GPS belum didapat. Coba lagi di area terbuka.',
};

function toMapIssue(
  permission: 'granted' | 'denied' | 'undetermined' | 'checking',
  issue: LocationIssue | null
): MapIssue | null {
  if (issue === 'mocked') return { kind: 'mocked' };
  if (issue === 'permission-denied') return { kind: 'permission', action: 'settings' };
  if (issue === 'services-disabled') return { kind: 'gps', action: 'settings' };
  if (issue === 'timeout' || issue === 'unavailable') {
    return { kind: 'timeout' };
  }
  if (permission === 'undetermined') return { kind: 'permission', action: 'request' };
  if (permission === 'denied') return { kind: 'permission', action: 'settings' };
  return null;
}

/**
 * FR-P1-03: layar peta laboratorium untuk kedua peran.
 *
 * Dipakai oleh route `/maps` dan tab "Peta" pada kedua peran. Semua data
 * berasal dari Firestore (`laboratorium`) dengan listener real-time, dan posisi
 * pengguna mengikuti GPS perangkat selama layar aktif.
 */
export function LabMapScreen() {
  const theme = useTheme();
  const { laboratories, loading, error, retry } = useLaboratories();
  const {
    position,
    permission,
    issue,
    loading: locationLoading,
    requestPermission,
    refresh,
    openSettings,
  } = useDevicePosition();

  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);

  const selectedLaboratory = useMemo(
    () => laboratories.find((laboratory) => laboratory.id === selectedLabId) ?? null,
    [laboratories, selectedLabId]
  );

  const handleSelect = useCallback((laboratory: Laboratory | null) => {
    setSelectedLabId(laboratory?.id ?? null);
  }, []);

  const mapIssue = toMapIssue(permission, issue);

  const handleIssueAction = () => {
    if (!mapIssue) return;
    if (mapIssue.kind === 'permission' && mapIssue.action === 'request') {
      void requestPermission();
      return;
    }
    if ('action' in mapIssue && mapIssue.action === 'settings') {
      void openSettings();
      return;
    }
    if (mapIssue.kind === 'mocked' || mapIssue.kind === 'timeout') {
      refresh();
    }
  };

  const issueActionLabel = (): string => {
    if (!mapIssue) return '';
    if (mapIssue.kind === 'permission' && mapIssue.action === 'request') {
      return 'Aktifkan';
    }
    if ('action' in mapIssue && mapIssue.action === 'settings') {
      return 'Pengaturan';
    }
    return 'Coba lagi';
  };

  const showIssueAction =
    Boolean(mapIssue) && !(Platform.OS === 'web' && mapIssue?.kind === 'permission' && mapIssue.action === 'settings');

  if (loading) {
    return (
      <TabScreen title="Peta Laboratorium">
        <View style={styles.centered}>
          <LoadingState label="Memuat laboratorium…" />
        </View>
      </TabScreen>
    );
  }

  return (
    <TabScreen title="Peta Laboratorium">
      <View style={styles.container}>
        {mapIssue ? (
          <View style={[styles.banner, { backgroundColor: theme.warningSoft }]}>
            <Text style={[styles.bannerText, { color: theme.warning }]}>
              {ISSUE_COPY[mapIssue.kind]}
            </Text>
            {showIssueAction ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={handleIssueAction}
                style={styles.bannerAction}>
                <Text style={[styles.bannerActionLabel, { color: theme.warning }]}>
                  {issueActionLabel()}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {error ? (
          <View style={[styles.banner, { backgroundColor: theme.errorSoft }]}>
            <Text style={[styles.bannerText, { color: theme.error }]}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={retry}
              style={styles.bannerAction}>
              <Text style={[styles.bannerActionLabel, { color: theme.error }]}>
                Muat ulang
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.mapWrap}>
          <LabMapView
            laboratories={laboratories}
            onSelectLaboratory={handleSelect}
            selectedLabId={selectedLabId}
            userPosition={position}
          />

          {!error && laboratories.length === 0 ? (
            <View style={styles.emptyOverlay} pointerEvents="box-none">
              <View
                style={[
                  styles.emptyCard,
                  Shadow.soft,
                  { backgroundColor: theme.surface },
                ]}>
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                  Belum ada laboratorium
                </Text>
                <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
                  Titik laboratorium akan muncul otomatis setelah asisten menambahkan
                  data laboratorium.
                </Text>
                <AppButton label="Muat ulang" onPress={retry} variant="secondary" />
              </View>
            </View>
          ) : null}

          {Platform.OS !== 'web' && selectedLaboratory ? (
            <SelectedLabCard
              distance={
                position
                  ? distanceToLaboratory(position, selectedLaboratory)
                  : null
              }
              laboratory={selectedLaboratory}
              onClose={() => handleSelect(null)}
              userPosition={position}
            />
          ) : null}

          {locationLoading && !position ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <View style={styles.loadingPill}>
                <Text style={[styles.loadingText, { color: theme.onPrimary }]}>
                  Membaca lokasi…
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </TabScreen>
  );
}

function SelectedLabCard({
  laboratory,
  distance,
  userPosition,
  onClose,
}: {
  laboratory: Laboratory;
  distance: number | null;
  userPosition: DevicePosition | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insideRadius =
    distance !== null && laboratory.radiusMeter > 0 && distance <= laboratory.radiusMeter;

  return (
    <View
      style={[styles.selectedCard, Shadow.sheet, { backgroundColor: theme.surface }]}>
      <View style={styles.rowBetween}>
        <Text style={[styles.selectedName, { color: theme.textPrimary }]}>
          {laboratory.name}
        </Text>
        <Pressable
          accessibilityLabel="Tutup informasi laboratorium"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onClose}>
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={18}
            tintColor={theme.textSecondary}
          />
        </Pressable>
      </View>

      <Text style={[styles.selectedMeta, { color: theme.textSecondary }]}>
        {laboratory.building || 'Gedung belum diisi'}
      </Text>

      <View style={styles.rowBetween}>
        <Text style={[styles.selectedMeta, { color: theme.textSecondary }]}>
          {laboratory.radiusMeter > 0
            ? `Radius presensi ${laboratory.radiusMeter} m`
            : 'Radius presensi belum diatur'}
        </Text>
        <Text
          style={[
            styles.selectedDistance,
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
            ? userPosition
              ? 'Menghitung jarak…'
              : 'Lokasi tidak aktif'
            : `${formatDistanceMeters(distance)} dari Anda`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', padding: Spacing.three },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  bannerText: { ...Typography.caption, flex: 1 },
  bannerAction: { paddingVertical: Spacing.one },
  bannerActionLabel: { ...Typography.caption, fontWeight: '700' },
  mapWrap: { flex: 1, minHeight: 240 },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  emptyCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  emptyTitle: { ...Typography.cardTitle },
  emptyBody: { ...Typography.body },
  selectedCard: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: Spacing.three,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  selectedName: { ...Typography.cardTitle, flexShrink: 1 },
  selectedMeta: { ...Typography.caption },
  selectedDistance: { ...Typography.caption, fontWeight: '700' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  loadingOverlay: {
    position: 'absolute',
    top: Spacing.three,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingPill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  loadingText: { ...Typography.caption, fontWeight: '600' },
});
