// src/components/location/location-status-panel.tsx
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LocationIssue } from '@/types/location';

/**
 * FR-P1-01: penjelasan sebelum dialog izin sistem, sekaligus fallback ketika
 * izin ditolak, GPS mati, GPS timeout, atau lokasi palsu terdeteksi.
 *
 * Semua teks memakai bahasa Indonesia dan menyebutkan alasan permintaan izin
 * (verifikasi kehadiran di laboratorium) agar pengguna bisa mengambil keputusan.
 */
interface LocationStatusPanelProps {
  /** `undetermined` = belum pernah diminta; sisanya berasal dari LocationIssue. */
  state: LocationIssue | 'undetermined';
  busy?: boolean;
  onRequestPermission?: () => void;
  onRetry?: () => void;
  onOpenSettings?: () => void;
}

const COPY: Record<
  LocationIssue | 'undetermined',
  { title: string; description: string; tone: 'info' | 'warning' | 'error' }
> = {
  undetermined: {
    title: 'Izin lokasi diperlukan',
    description:
      'PrakYuks memakai lokasi Anda hanya saat aplikasi terbuka, untuk memastikan presensi tercatat di dalam radius laboratorium. Lokasi tidak dipakai untuk pelacakan di luar presensi.',
    tone: 'info',
  },
  'permission-denied': {
    title: 'Izin lokasi ditolak',
    description:
      'Akses lokasi diblokir sehingga jarak ke laboratorium tidak dapat dihitung. Aktifkan izin lokasi melalui Pengaturan aplikasi.',
    tone: 'warning',
  },
  'services-disabled': {
    title: 'Lokasi perangkat mati',
    description:
      'GPS/layanan lokasi sedang nonaktif. Aktifkan lokasi pada perangkat, lalu coba lagi.',
    tone: 'warning',
  },
  timeout: {
    title: 'GPS tidak merespons',
    description:
      'Sinyal lokasi belum didapat. Pindah ke area terbuka, pastikan GPS aktif, lalu coba lagi.',
    tone: 'warning',
  },
  unavailable: {
    title: 'Lokasi tidak tersedia',
    description:
      'Perangkat gagal membaca posisi saat ini. Periksa pengaturan lokasi lalu coba lagi.',
    tone: 'warning',
  },
  mocked: {
    title: 'Lokasi palsu terdeteksi',
    description:
      'Perangkat melaporkan lokasi simulasi. Nonaktifkan aplikasi lokasi palsu (fake GPS) agar presensi dapat diverifikasi.',
    tone: 'error',
  },
};

export function LocationStatusPanel({
  state,
  busy = false,
  onRequestPermission,
  onRetry,
  onOpenSettings,
}: LocationStatusPanelProps) {
  const theme = useTheme();
  const copy = COPY[state];

  const backgroundColor =
    copy.tone === 'error'
      ? theme.errorSoft
      : copy.tone === 'warning'
        ? theme.warningSoft
        : theme.surfaceSubtle;

  const titleColor =
    copy.tone === 'error'
      ? theme.error
      : copy.tone === 'warning'
        ? theme.warning
        : theme.textPrimary;

  const showSettings =
    Boolean(onOpenSettings) && (state === 'permission-denied' || state === 'services-disabled');

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.card, { backgroundColor }]}>
      <Text style={[styles.title, { color: titleColor }]}>{copy.title}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        {copy.description}
      </Text>

      {busy ? (
        <View style={styles.busyRow}>
          <ActivityIndicator color={theme.primary} />
          <Text style={[styles.busyLabel, { color: theme.textSecondary }]}>
            Membaca lokasi…
          </Text>
        </View>
      ) : (
        <View style={styles.actions}>
          {state === 'undetermined' && onRequestPermission ? (
            <AppButton label="Izinkan akses lokasi" onPress={onRequestPermission} />
          ) : null}

          {showSettings ? (
            <AppButton
              label="Buka Pengaturan"
              onPress={onOpenSettings ?? (() => undefined)}
              variant="secondary"
            />
          ) : null}

          {state !== 'undetermined' && onRetry ? (
            <AppButton label="Coba lagi" onPress={onRetry} />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  title: { ...Typography.cardTitle },
  description: { ...Typography.body },
  actions: { gap: Spacing.two, marginTop: Spacing.one },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  busyLabel: { ...Typography.caption },
});
