import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { AppButton } from '@/components/ui/app-button';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useSessionDetail } from '@/hooks/use-session-detail';
import { useTheme } from '@/hooks/use-theme';
import {
  QR_ROTATION_INTERVAL_SECONDS,
  encodeQrPresencePayload,
} from '@/lib/qr-presence';
import {
  clearSessionQrToken,
  rotateSessionQrToken,
} from '@/services/qrPresenceService';
import { useAuth } from '@/store/auth-context';
import type { Practicum, Session } from '@/types/attendance';

export default function AsistenQrScreen() {
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
    <DetailScreen title="QR Presensi">
      <View style={styles.fallback}>
        <EmptyState
          title="Sesi tidak ditemukan"
          description="Kode QR hanya dapat ditampilkan untuk sesi yang Anda ampu."
          actionLabel="Kembali ke jadwal"
          onAction={() => router.replace('/asisten')}
        />
      </View>
    </DetailScreen>
  );

  if (!practicumId) {
    return renderFallback();
  }

  if (loading) {
    return (
      <DetailScreen title="QR Presensi">
        <View style={styles.fallback}>
          <LoadingState label="Memuat sesi presensi…" />
        </View>
      </DetailScreen>
    );
  }

  if (error) {
    return (
      <DetailScreen title="QR Presensi">
        <View style={styles.fallback}>
          <ErrorState message={error} onRetry={retry} />
        </View>
      </DetailScreen>
    );
  }

  if (!practicum || !session) {
    return renderFallback();
  }

  if (practicum.assistantId !== profile?.uid) {
    return <Redirect href="/asisten" />;
  }

  return (
    <DetailScreen title="QR Presensi">
      <AsistenQrDisplay practicum={practicum} session={session} />
    </DetailScreen>
  );
}

interface AsistenQrDisplayProps {
  practicum: Practicum;
  session: Session;
}

function performQrTokenRotation(
  practicumId: string,
  sessionId: string,
  handlers: {
    isActive: () => boolean;
    onSuccess: (token: string) => void;
    onError: (message: string) => void;
    onSettled: () => void;
  }
) {
  rotateSessionQrToken(practicumId, sessionId)
    .then((result) => {
      if (handlers.isActive()) {
        handlers.onSuccess(result.token);
      }
    })
    .catch((err: unknown) => {
      if (!handlers.isActive()) {
        return;
      }
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Gagal memperbarui token QR presensi.';
      handlers.onError(message);
    })
    .finally(() => {
      handlers.onSettled();
    });
}

function AsistenQrDisplay({ practicum, session }: AsistenQrDisplayProps) {
  const router = useRouter();
  const theme = useTheme();

  const [token, setToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_ROTATION_INTERVAL_SECONDS);
  const [rotating, setRotating] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const rotatingRef = useRef(false);
  const nextRotateAtRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const rotateTokenAsync = useCallback(() => {
    if (rotatingRef.current || session.status !== 'open') {
      return;
    }

    rotatingRef.current = true;
    performQrTokenRotation(practicum.id, session.id, {
      isActive: () => mountedRef.current,
      onSuccess: (nextToken) => {
        nextRotateAtRef.current =
          Date.now() + QR_ROTATION_INTERVAL_SECONDS * 1000;
        setToken(nextToken);
        setQrError(null);
        setSecondsLeft(QR_ROTATION_INTERVAL_SECONDS);
      },
      onError: setQrError,
      onSettled: () => {
        rotatingRef.current = false;
        if (mountedRef.current) {
          setRotating(false);
        }
      },
    });
  }, [practicum.id, session.id, session.status]);

  const handleManualRefresh = () => {
    if (rotatingRef.current || session.status !== 'open') {
      return;
    }
    setRotating(true);
    setQrError(null);
    rotateTokenAsync();
  };

  useEffect(() => {
    if (session.status !== 'open') {
      void clearSessionQrToken(practicum.id, session.id);
      return;
    }

    let active = true;
    rotatingRef.current = true;

    performQrTokenRotation(practicum.id, session.id, {
      isActive: () => active && mountedRef.current,
      onSuccess: (nextToken) => {
        nextRotateAtRef.current =
          Date.now() + QR_ROTATION_INTERVAL_SECONDS * 1000;
        setToken(nextToken);
        setQrError(null);
        setSecondsLeft(QR_ROTATION_INTERVAL_SECONDS);
      },
      onError: (message) => setQrError(message),
      onSettled: () => {
        rotatingRef.current = false;
        if (active && mountedRef.current) {
          setRotating(false);
        }
      },
    });

    const timer = setInterval(() => {
      if (nextRotateAtRef.current === 0) {
        return;
      }
      const remaining = Math.max(
        0,
        Math.ceil((nextRotateAtRef.current - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      if (remaining === 0 && !rotatingRef.current) {
        rotateTokenAsync();
      }
    }, 1000);

    return () => {
      active = false;
      clearInterval(timer);
      nextRotateAtRef.current = 0;
      void clearSessionQrToken(practicum.id, session.id);
    };
  }, [practicum.id, session.id, session.status, rotateTokenAsync]);

  const navigateBackToSession = () => {
    router.back();
  };

  if (session.status !== 'open') {
    const isUpcoming = session.status === 'upcoming';
    return (
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={styles.fallback}>
          <EmptyState
            title={isUpcoming ? 'Sesi belum dibuka' : 'Sesi telah ditutup'}
            description={
              isUpcoming
                ? 'Buka sesi terlebih dahulu untuk menampilkan kode QR presensi.'
                : 'Kode QR dinonaktifkan secara otomatis karena sesi sudah ditutup.'
            }
            actionLabel="Kembali ke sesi"
            onAction={navigateBackToSession}
          />
        </View>
      </View>
    );
  }

  const qrPayload = token
    ? encodeQrPresencePayload({
        practicumId: practicum.id,
        sessionId: session.id,
        token,
      })
    : null;

  return (
    <View style={[styles.sheet, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.infoCard,
            Shadow.soft,
            { backgroundColor: theme.surface },
          ]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {practicum.name}
            </Text>
            <StatusBadge status={session.status} />
          </View>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {practicum.className} · {session.room} · {session.startTime}–
            {session.endTime} WIB
          </Text>
        </View>

        <View
          style={[
            styles.qrCard,
            Shadow.soft,
            { backgroundColor: theme.surface },
          ]}>
          {qrError && !qrPayload ? (
            <View style={styles.qrPlaceholder}>
              <ErrorState message={qrError} onRetry={handleManualRefresh} />
            </View>
          ) : qrPayload ? (
            <View style={styles.qrBox}>
              <QRCode
                value={qrPayload}
                size={220}
                color="#141110"
                backgroundColor="#FFFFFF"
                ecl="M"
              />
            </View>
          ) : (
            <View style={styles.qrPlaceholder}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                Menyiapkan kode QR presensi…
              </Text>
            </View>
          )}

          <View style={styles.countdownWrap}>
            <Text style={[styles.countdownLabel, { color: theme.primary }]}>
              {rotating
                ? 'Memperbarui kode QR…'
                : `Kode diperbarui otomatis dalam ${secondsLeft} detik`}
            </Text>
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              Tunjukkan kode QR ini kepada praktikan di kelas. Kode lama akan
              kedaluwarsa secara otomatis untuk mencegah titip presensi.
            </Text>
          </View>

          {qrError && qrPayload ? (
            <View
              style={[styles.errorBanner, { backgroundColor: theme.errorSoft }]}>
              <Text style={[styles.errorText, { color: theme.error }]}>
                {qrError}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <AppButton
            label="Perbarui QR sekarang"
            variant="secondary"
            loading={rotating}
            onPress={handleManualRefresh}
          />
          <AppButton label="Kembali ke sesi" onPress={navigateBackToSession} />
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
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  infoCard: {
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
  title: { ...Typography.cardTitle, flex: 1, minWidth: 0 },
  meta: { ...Typography.caption },
  qrCard: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
  },
  qrBox: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DDD6',
  },
  qrPlaceholder: {
    width: 244,
    height: 244,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  countdownWrap: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  countdownLabel: {
    ...Typography.label,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  helperText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  errorBanner: {
    width: '100%',
    borderRadius: Radius.md,
    padding: Spacing.two,
  },
  errorText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.two,
  },
});
