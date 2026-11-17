import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AttendanceRecap } from '@/components/attendance/attendance-recap';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { Spacing } from '@/constants/theme';
import { useSessionDetail } from '@/hooks/use-session-detail';
import { useAuth } from '@/store/auth-context';

export default function AsistenRecapScreen() {
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
    <DetailScreen title="Rekap Kehadiran">
      <View style={styles.fallback}>
        <EmptyState
          title="Sesi tidak ditemukan"
          description="Rekap hanya dapat dibuka dari sesi yang Anda ampu."
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
      <DetailScreen title="Rekap Kehadiran">
        <View style={styles.fallback}>
          <LoadingState label="Memuat rekap kehadiran…" />
        </View>
      </DetailScreen>
    );
  }

  if (error) {
    return (
      <DetailScreen title="Rekap Kehadiran">
        <View style={styles.fallback}>
          <ErrorState message={error} onRetry={retry} />
        </View>
      </DetailScreen>
    );
  }

  if (!practicum || !session) {
    return renderFallback();
  }

  // Authorisasi: hanya asisten pengampu yang dapat melihat rekap.
  if (practicum.assistantId !== profile?.uid) {
    return <Redirect href="/asisten" />;
  }

  return (
    <DetailScreen title="Rekap Kehadiran">
      <AttendanceRecap practicum={practicum} session={session} />
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, justifyContent: 'center', padding: Spacing.three },
});
