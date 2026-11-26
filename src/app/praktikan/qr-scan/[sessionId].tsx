import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AttendanceSuccessPanel } from '@/components/attendance/attendance-success-panel';
import { AppButton } from '@/components/ui/app-button';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useSessionAttendance } from '@/hooks/use-session-attendance';
import { useSessionDetail } from '@/hooks/use-session-detail';
import { useSessionLeave } from '@/hooks/use-session-leave';
import { useTheme } from '@/hooks/use-theme';
import { parseQrPresencePayload } from '@/lib/qr-presence';
import { formatTimestampToTime } from '@/services/attendanceService';
import { useAuth } from '@/store/auth-context';
import type { Practicum, Session } from '@/types/attendance';
import type { UserProfile } from '@/types/auth';

export default function PraktikanQrScanScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { sessionId, practicumId } = useLocalSearchParams<{
    sessionId: string;
    practicumId?: string;
  }>();

  const { practicum, session, loading, error, retry } = useSessionDetail(
    practicumId,
    sessionId
  );

  const renderFallback = () => (
    <DetailScreen title="Pindai QR Presensi">
      <View style={styles.fallback}>
        <EmptyState
          title="Sesi tidak ditemukan"
          description="Sesi yang Anda pilih tidak tersedia. Kembali ke jadwal untuk memilih sesi lain."
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
      <DetailScreen title="Pindai QR Presensi">
        <View style={styles.fallback}>
          <LoadingState label="Memuat sesi presensi…" />
        </View>
      </DetailScreen>
    );
  }

  if (error) {
    return (
      <DetailScreen title="Pindai QR Presensi">
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

  return (
    <DetailScreen title="Pindai QR Presensi">
      <PraktikanQrScanner
        practicum={practicum}
        session={session}
        profile={profile}
      />
    </DetailScreen>
  );
}

interface PraktikanQrScannerProps {
  practicum: Practicum;
  session: Session;
  profile: UserProfile;
}

type ScanFeedback =
  | { kind: 'processing'; message: string }
  | { kind: 'error'; message: string }
  | null;

function PraktikanQrScanner({
  practicum,
  session,
  profile,
}: PraktikanQrScannerProps) {
  const router = useRouter();
  const theme = useTheme();
  const { showToast } = useToast();

  const {
    myRecord,
    loading: attendanceLoading,
    error: attendanceError,
    retry: retryAttendance,
    handleRecordAttendance,
  } = useSessionAttendance(practicum.id, session.id, {
    role: 'praktikan',
    userId: profile.uid,
  });

  const {
    myLeaveRequest,
    loading: leaveLoading,
    error: leaveError,
    retry: retryLeave,
  } = useSessionLeave({
    practicumId: practicum.id,
    sessionId: session.id,
    currentUserId: profile.uid,
    isAsisten: false,
  });

  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const processingRef = useRef(false);

  const navigateBackToSession = () => {
    router.replace({
      pathname: '/praktikan/session/[sessionId]',
      params: { sessionId: session.id, practicumId: practicum.id },
    });
  };

  const handleResetScan = () => {
    processingRef.current = false;
    setScanFeedback(null);
  };

  const handleRequestPermission = async () => {
    setRequestingPermission(true);
    try {
      await requestPermission();
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      showToast('Tidak dapat membuka pengaturan perangkat.', 'error');
    }
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (processingRef.current || session.status !== 'open' || myRecord) {
      return;
    }

    const rawData = typeof result?.data === 'string' ? result.data : '';
    if (!rawData) {
      return;
    }

    // Kunci instan mencegah pemindaian ganda sebelum state selesai diperbarui.
    processingRef.current = true;

    const parsed = parseQrPresencePayload(rawData);
    if (!parsed.ok) {
      const message = 'Kode QR tidak valid atau bukan milik PrakYuks.';
      setScanFeedback({ kind: 'error', message });
      showToast(message, 'error');
      return;
    }

    if (
      parsed.practicumId !== practicum.id ||
      parsed.sessionId !== session.id
    ) {
      const message =
        'Kode QR ini milik sesi atau praktikum lain. Pindai QR dari asisten sesi ini.';
      setScanFeedback({ kind: 'error', message });
      showToast('Kode QR bukan untuk sesi ini.', 'error');
      return;
    }

    setScanFeedback({
      kind: 'processing',
      message: 'Memverifikasi token QR dan mencatat kehadiran…',
    });

    try {
      const recorded = await handleRecordAttendance({
        praktikanId: profile.uid,
        praktikanName: profile.name,
        praktikanNim: profile.identifier,
        qrVerification: { token: parsed.token },
      });

      if (recorded.punctualityStatus === 'late') {
        const fineText = recorded.fineAmount
          ? ` Denda Rp ${recorded.fineAmount.toLocaleString('id-ID')} diterbitkan.`
          : '';
        showToast(
          `Kehadiran dicatat (Terlambat +${recorded.lateMinutes} mnt).${fineText}`,
          'error'
        );
      } else {
        showToast(
          `Kehadiran berhasil dicatat (Tepat Waktu) pada pukul ${recorded.recordedAtDisplay}`,
          'success'
        );
      }
      navigateBackToSession();
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Gagal mencatat kehadiran lewat QR.';
      setScanFeedback({ kind: 'error', message });
      showToast(message, 'error');
    }
  };

  if (attendanceLoading || leaveLoading) {
    return (
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.fallback}>
          <LoadingState label="Memeriksa status presensi…" />
        </View>
      </View>
    );
  }

  if (attendanceError || leaveError) {
    return (
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.fallback}>
          <ErrorState
            message={attendanceError ?? leaveError ?? 'Gagal memuat data sesi.'}
            onRetry={() => {
              retryAttendance();
              retryLeave();
            }}
          />
        </View>
      </View>
    );
  }

  if (myRecord) {
    return (
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <AttendanceSuccessPanel
            recordedAt={formatTimestampToTime(myRecord.recordedAt)}
            punctualityStatus={myRecord.punctualityStatus}
            lateMinutes={myRecord.lateMinutes}
          />
          <Text style={[styles.helperText, { color: theme.textSecondary }]}>
            Kehadiran Anda pada sesi {practicum.name} sudah tercatat. Pemindaian
            ulang tidak diperlukan.
          </Text>
          <AppButton
            label="Kembali ke detail sesi"
            onPress={navigateBackToSession}
          />
        </ScrollView>
      </View>
    );
  }

  if (myLeaveRequest?.status === 'approved') {
    return (
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.fallback}>
          <EmptyState
            title="Izin disetujui (Excused Absence)"
            description="Anda tidak perlu memindai QR karena pengajuan izin untuk sesi ini telah disetujui (bebas denda keterlambatan)."
            actionLabel="Kembali ke detail sesi"
            onAction={navigateBackToSession}
          />
        </View>
      </View>
    );
  }

  if (session.status !== 'open') {
    const isUpcoming = session.status === 'upcoming';
    return (
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.fallback}>
          <EmptyState
            title={isUpcoming ? 'Sesi belum dibuka' : 'Sesi telah ditutup'}
            description={
              isUpcoming
                ? 'Presensi QR hanya tersedia setelah asisten membuka sesi.'
                : 'Sesi praktikum ini sudah ditutup sehingga presensi QR tidak lagi diterima.'
            }
            actionLabel="Kembali ke detail sesi"
            onAction={navigateBackToSession}
          />
        </View>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.fallback}>
          <EmptyState
            title="Pemindai kamera tidak tersedia di web"
            description="Gunakan aplikasi Android atau iOS untuk memindai kode QR presensi, atau gunakan presensi lokasi."
            actionLabel="Kembali ke detail sesi"
            onAction={navigateBackToSession}
          />
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.fallback}>
          <LoadingState label="Memeriksa izin kamera…" />
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    const permanentlyDenied = !permission.canAskAgain;
    return (
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View
            accessibilityRole="alert"
            style={[
              styles.permissionCard,
              { backgroundColor: theme.warningSoft },
            ]}>
            <Text style={[styles.permissionTitle, { color: theme.warning }]}>
              {permanentlyDenied
                ? 'Izin kamera diblokir'
                : 'Izin kamera diperlukan'}
            </Text>
            <Text style={[styles.permissionBody, { color: theme.textSecondary }]}>
              {permanentlyDenied
                ? 'Akses kamera ditolak secara permanen. Aktifkan izin Kamera untuk PrakYuks melalui Pengaturan perangkat agar Anda bisa memindai QR presensi.'
                : 'PrakYuks memerlukan akses kamera untuk memindai kode QR presensi yang ditampilkan oleh asisten di kelas.'}
            </Text>
            <View style={styles.permissionActions}>
              {permanentlyDenied ? (
                <AppButton
                  label="Buka Pengaturan"
                  onPress={() => void handleOpenSettings()}
                />
              ) : (
                <AppButton
                  label="Izinkan Kamera"
                  loading={requestingPermission}
                  onPress={() => void handleRequestPermission()}
                />
              )}
              <AppButton
                label="Kembali ke detail sesi"
                variant="secondary"
                onPress={navigateBackToSession}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (cameraError) {
    return (
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.fallback}>
          <ErrorState
            message={`Kamera tidak tersedia atau gagal dibuka: ${cameraError}`}
            onRetry={() => setCameraError(null)}
          />
          <View style={styles.fallbackBack}>
            <AppButton
              label="Kembali ke detail sesi"
              variant="secondary"
              onPress={navigateBackToSession}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.sheet, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.sessionCard,
            Shadow.soft,
            { backgroundColor: theme.surface },
          ]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sessionTitle, { color: theme.textPrimary }]}>
              {practicum.name}
            </Text>
            <StatusBadge status={session.status} />
          </View>
          <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
            {practicum.className} · {session.room} · {session.startTime}–
            {session.endTime} WIB
          </Text>
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchEnabled}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onMountError={(event: any) => setCameraError(event.message)}
            onBarcodeScanned={scanFeedback ? undefined : handleBarcodeScanned}
          />
          <View pointerEvents="none" style={styles.reticleOverlay}>
            <View style={[styles.reticleFrame, { borderColor: theme.primary }]} />
          </View>
        </View>

        {scanFeedback?.kind === 'processing' ? (
          <View
            style={[
              styles.feedbackCard,
              { backgroundColor: theme.surfaceSubtle },
            ]}>
            <ActivityIndicator color={theme.primary} />
            <Text style={[styles.feedbackText, { color: theme.textPrimary }]}>
              {scanFeedback.message}
            </Text>
          </View>
        ) : null}

        {scanFeedback?.kind === 'error' ? (
          <View
            accessibilityRole="alert"
            style={[styles.errorCard, { backgroundColor: theme.errorSoft }]}>
            <Text style={[styles.errorCardText, { color: theme.error }]}>
              {scanFeedback.message}
            </Text>
            <AppButton label="Pindai ulang" onPress={handleResetScan} />
          </View>
        ) : null}

        <View style={styles.controls}>
          <AppButton
            label={torchEnabled ? 'Matikan Senter' : 'Nyalakan Senter'}
            variant="secondary"
            onPress={() => setTorchEnabled((prev) => !prev)}
          />
          <Text style={[styles.helperText, { color: theme.textSecondary }]}>
            Arahkan bingkai ke kode QR pada layar asisten. Kode QR berganti
            berkala; jika gagal karena kedaluwarsa, ketuk Pindai ulang.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    marginTop: -24,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  fallbackBack: {
    marginTop: Spacing.three,
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  sessionCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  sessionTitle: { ...Typography.cardTitle, flex: 1, minWidth: 0 },
  sessionMeta: { ...Typography.caption },
  cameraContainer: {
    width: '100%',
    aspectRatio: 1,
    maxHeight: 360,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: '#141110',
    position: 'relative',
  },
  reticleOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 17, 16, 0.22)',
  },
  reticleFrame: {
    width: 210,
    height: 210,
    borderRadius: Radius.lg,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  permissionCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  permissionTitle: { ...Typography.cardTitle },
  permissionBody: { ...Typography.body },
  permissionActions: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  feedbackCard: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  feedbackText: {
    ...Typography.label,
    flex: 1,
  },
  errorCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  errorCardText: {
    ...Typography.label,
  },
  controls: {
    gap: Spacing.two,
  },
  helperText: {
    ...Typography.caption,
    textAlign: 'center',
  },
});
