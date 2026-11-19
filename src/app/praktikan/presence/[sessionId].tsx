// src/app/praktikan/presence/[sessionId].tsx
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AttendanceSuccessPanel } from '@/components/attendance/attendance-success-panel';
import { LocationStatusPanel } from '@/components/location/location-status-panel';
import { PresenceDistanceCard } from '@/components/location/presence-distance-card';
import { AppButton } from '@/components/ui/app-button';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useDevicePosition } from '@/hooks/use-device-position';
import { useLaboratories } from '@/hooks/use-laboratories';
import { useSessionAttendance } from '@/hooks/use-session-attendance';
import { useSessionDetail } from '@/hooks/use-session-detail';
import { useTheme } from '@/hooks/use-theme';
import { formatDistanceMeters } from '@/lib/format-distance';
import { formatTimestampToTime } from '@/services/attendanceService';
import { findLaboratoryForSession } from '@/services/laboratoryService';
import {
  distanceToLaboratory,
  getCurrentCoordinates,
  LocationServiceError,
  roundDistanceMeters,
} from '@/services/locationService';
import { useAuth } from '@/store/auth-context';

/**
 * FR-P1-02: layar presensi berbasis lokasi.
 *
 * Presensi hanya dapat dikirim bila keempat syarat terpenuhi:
 *   1. sesi berstatus `open`,
 *   2. perangkat berada dalam `radiusMeter` laboratorium,
 *   3. praktikan belum tercatat pada sesi ini,
 *   4. posisi berasal dari GPS asli (bukan mock) dan izin lokasi diberikan.
 *
 * Posisi dibaca ulang tepat sebelum menulis agar submit tidak memakai jarak
 * yang sudah kedaluwarsa saat pengguna berjalan keluar ruangan.
 */
export default function PraktikanPresenceScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { profile } = useAuth();
  const { sessionId, practicumId } = useLocalSearchParams<{
    sessionId: string;
    practicumId?: string;
  }>();

  const { practicum, session, loading, error, retry } = useSessionDetail(
    practicumId,
    sessionId
  );
  const {
    laboratories,
    loading: laboratoriesLoading,
    error: laboratoriesError,
    retry: retryLaboratories,
  } = useLaboratories();
  const {
    position,
    permission,
    issue,
    loading: locationLoading,
    busy: permissionBusy,
    requestPermission,
    refresh,
    openSettings,
  } = useDevicePosition();

  const {
    myRecord,
    loading: attendanceLoading,
    handleRecordAttendance,
  } = useSessionAttendance(practicumId ?? '', sessionId ?? '', {
    role: 'praktikan',
    userId: profile?.uid,
  });

  const [submitting, setSubmitting] = useState(false);

  const laboratory = useMemo(
    () => (session ? findLaboratoryForSession(laboratories, session) : null),
    [laboratories, session]
  );

  const distanceMeters = useMemo(
    () =>
      position && laboratory
        ? distanceToLaboratory(position, laboratory)
        : null,
    [position, laboratory]
  );

  const radiusMeters = laboratory?.radiusMeter ?? 0;
  const hasLaboratoryPoint = Boolean(laboratory) && radiusMeters > 0;
  const insideRadius =
    distanceMeters !== null && hasLaboratoryPoint && distanceMeters <= radiusMeters;
  const outOfRadiusBy =
    distanceMeters !== null && hasLaboratoryPoint && distanceMeters > radiusMeters
      ? distanceMeters - radiusMeters
      : 0;
  const locationBlocked = Boolean(issue) || permission !== 'granted';

  const renderFallback = () => (
    <DetailScreen title="Presensi Lokasi">
      <View style={styles.fallback}>
        <EmptyState
          title="Sesi tidak ditemukan"
          description="Sesi yang Anda cari tidak tersedia. Kembali ke jadwal untuk memilih sesi lain."
          actionLabel="Kembali ke jadwal"
          onAction={() => router.replace('/praktikan')}
        />
      </View>
    </DetailScreen>
  );

  if (!practicumId) {
    return renderFallback();
  }

  if (loading) {
    return (
      <DetailScreen title="Presensi Lokasi">
        <View style={styles.fallback}>
          <LoadingState label="Memuat sesi…" />
        </View>
      </DetailScreen>
    );
  }

  if (error) {
    return (
      <DetailScreen title="Presensi Lokasi">
        <View style={styles.fallback}>
          <ErrorState message={error} onRetry={retry} />
        </View>
      </DetailScreen>
    );
  }

  if (!practicum || !session) {
    return renderFallback();
  }

  if (!profile || !practicum.studentIds?.includes(profile.uid)) {
    return <Redirect href="/praktikan" />;
  }

  const handleSubmit = async () => {
    if (!profile || !laboratory || submitting) {
      return;
    }

    if (session.status !== 'open') {
      showToast('Sesi belum dibuka atau sudah ditutup.', 'error');
      return;
    }

    if (myRecord) {
      showToast('Kehadiran sudah dicatat sebelumnya.', 'error');
      return;
    }

    if (laboratory.radiusMeter <= 0) {
      showToast('Radius laboratorium belum diatur oleh asisten.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Baca ulang posisi: jarak yang tampil di layar bisa sudah berubah.
      const fresh = await getCurrentCoordinates({ timeoutMs: 12_000 });

      if (fresh.mocked) {
        throw new Error(
          'Lokasi palsu terdeteksi. Nonaktifkan fake GPS sebelum melakukan presensi.'
        );
      }

      const freshDistance = distanceToLaboratory(fresh, laboratory);

      if (freshDistance > laboratory.radiusMeter) {
        throw new Error(
          `Anda berada ${formatDistanceMeters(
            freshDistance - laboratory.radiusMeter
          )} di luar radius laboratorium.`
        );
      }

      const result = await handleRecordAttendance({
        praktikanId: profile.uid,
        praktikanName: profile.name,
        praktikanNim: profile.identifier,
        geofence: {
          distanceMeter: roundDistanceMeters(freshDistance),
          deviceLat: fresh.latitude,
          deviceLng: fresh.longitude,
          isLocationVerified: true,
        },
      });

      showToast(
        `Kehadiran berhasil dicatat pada pukul ${result.recordedAtDisplay}`,
        'success'
      );
      router.replace({
        pathname: '/praktikan/session/[sessionId]',
        params: { sessionId: session.id, practicumId: practicum.id },
      });
    } catch (submitError) {
      const message =
        submitError instanceof LocationServiceError || submitError instanceof Error
          ? submitError.message
          : 'Gagal mencatat kehadiran.';
      showToast(message, 'error');
      refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const buttonState = (): { label: string; disabled: boolean; loading: boolean } => {
    if (attendanceLoading) {
      return { label: 'Memuat status presensi…', disabled: true, loading: false };
    }
    if (myRecord) {
      return { label: 'Kehadiran sudah dicatat', disabled: true, loading: false };
    }
    if (session.status === 'upcoming') {
      return { label: 'Sesi belum dibuka', disabled: true, loading: false };
    }
    if (session.status === 'closed') {
      return { label: 'Sesi telah ditutup', disabled: true, loading: false };
    }
    if (locationLoading || permission === 'checking') {
      return { label: 'Membaca lokasi GPS…', disabled: true, loading: false };
    }
    if (issue === 'mocked') {
      return { label: 'Lokasi palsu terdeteksi', disabled: true, loading: false };
    }
    if (laboratoriesLoading && !hasLaboratoryPoint) {
      return { label: 'Memuat lokasi laboratorium…', disabled: true, loading: false };
    }
    if (!hasLaboratoryPoint) {
      return {
        label: 'Lokasi laboratorium belum diatur',
        disabled: true,
        loading: false,
      };
    }
    if (locationBlocked) {
      return { label: 'Izin lokasi diperlukan', disabled: true, loading: false };
    }
    if (!position) {
      return { label: 'Menunggu lokasi GPS…', disabled: true, loading: false };
    }
    if (!insideRadius) {
      return { label: 'Di luar radius laboratorium', disabled: true, loading: false };
    }
    return { label: 'Catat kehadiran', disabled: false, loading: submitting };
  };

  const button = buttonState();

  return (
    <DetailScreen title="Presensi Lokasi">
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
        ]}>
        <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.summary}>
            <View style={styles.rowBetween}>
              <Text style={[styles.date, { color: theme.textSecondary }]}>
                {session.date} · {session.startTime}–{session.endTime} WIB
              </Text>
              <StatusBadge status={session.status} />
            </View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {practicum.name}
            </Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {practicum.className} · {session.room}
            </Text>
          </View>

          <View
            style={[styles.infoCard, Shadow.soft, { backgroundColor: theme.surface }]}>
            <InfoRow label="Laboratorium" value={laboratory?.name ?? '—'} />
            <InfoRow label="Gedung" value={laboratory?.building || '—'} />
            <InfoRow label="Radius presensi" value={`${radiusMeters || '—'} m`} />
            {myRecord ? (
              <InfoRow
                label="Dicatat pukul"
                value={formatTimestampToTime(myRecord.recordedAt)}
              />
            ) : null}
          </View>

          {laboratory ? (
            <PresenceDistanceCard
              accuracyMeters={position?.accuracy ?? null}
              distanceMeters={distanceMeters}
              insideRadius={insideRadius}
              loading={locationLoading || permissionBusy}
              radiusMeters={radiusMeters}
            />
          ) : null}

          {outOfRadiusBy > 0 ? (
            <View
              accessibilityRole="alert"
              style={[styles.warning, { backgroundColor: theme.errorSoft }]}>
              <Text style={[styles.warningTitle, { color: theme.error }]}>
                Di luar jangkauan presensi
              </Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                Anda berada {formatDistanceMeters(outOfRadiusBy)} di luar radius
                laboratorium. Mendekat ke {laboratory?.name ?? 'laboratorium'} untuk
                mengaktifkan tombol presensi.
              </Text>
            </View>
          ) : null}

          {issue ? (
            <LocationStatusPanel
              busy={locationLoading || permissionBusy}
              onOpenSettings={Platform.OS === 'web' ? undefined : openSettings}
              onRetry={refresh}
              state={issue}
            />
          ) : permission === 'undetermined' ? (
            <LocationStatusPanel
              busy={permissionBusy || locationLoading}
              onRequestPermission={() => {
                void requestPermission();
              }}
              state="undetermined"
            />
          ) : null}

          {!laboratoriesLoading && !hasLaboratoryPoint ? (
            <View
              style={[styles.warning, { backgroundColor: theme.warningSoft }]}>
              <Text style={[styles.warningTitle, { color: theme.warning }]}>
                Titik laboratorium belum tersedia
              </Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                {laboratoriesError
                  ? 'Data laboratorium gagal dimuat. Periksa koneksi lalu coba lagi.'
                  : `Sesi ini menggunakan ruang "${session.room}", tetapi belum ada laboratorium dengan koordinat dan radius yang cocok. Minta asisten mengatur data laboratorium.`}
              </Text>
              {laboratoriesError ? (
                <AppButton
                  label="Muat ulang laboratorium"
                  onPress={retryLaboratories}
                  variant="secondary"
                />
              ) : null}
            </View>
          ) : null}

          <Text style={[styles.footnote, { color: theme.textTertiary }]}>
            Presensi hanya dapat dilakukan satu kali per sesi dan divalidasi
            terhadap radius laboratorium. Jarak dihitung di perangkat Anda.
          </Text>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <View style={styles.footerContent}>
            {myRecord ? (
              <AttendanceSuccessPanel
                recordedAt={formatTimestampToTime(myRecord.recordedAt)}
              />
            ) : (
              <>
                <AppButton
                  disabled={button.disabled}
                  label={button.label}
                  loading={button.loading}
                  onPress={handleSubmit}
                />
                {submitting || permissionBusy ? (
                  <View style={styles.progressRow}>
                    <ActivityIndicator color={theme.textSecondary} />
                    <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                      Memverifikasi posisi…
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>
      </View>
    </DetailScreen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, justifyContent: 'center', padding: Spacing.three },
  sheet: {
    flex: 1,
    marginTop: -Spacing.four,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.two,
  },
  scroll: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  summary: { gap: Spacing.one },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  date: { ...Typography.caption, fontWeight: '600', flexShrink: 1 },
  title: { ...Typography.screenTitle },
  meta: { ...Typography.caption },
  infoCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  infoLabel: { ...Typography.body },
  infoValue: { ...Typography.bodyStrong, flexShrink: 1, textAlign: 'right' },
  warning: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  warningTitle: { ...Typography.cardTitle },
  body: { ...Typography.body },
  footnote: { ...Typography.caption, textAlign: 'center' },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.three,
    alignItems: 'center',
  },
  footerContent: { width: '100%', maxWidth: 560, gap: Spacing.two },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  progressLabel: { ...Typography.caption },
});
