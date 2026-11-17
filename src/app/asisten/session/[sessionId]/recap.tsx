import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttendanceRecap } from '@/components/attendance/attendance-recap';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { Spacing } from '@/constants/theme';
import { useSessionDetail } from '@/hooks/use-session-detail';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';

export default function AsistenRecapScreen() {
  const router = useRouter();
  const theme = useTheme();
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
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <EmptyState
        title="Sesi tidak ditemukan"
        description="Rekap hanya dapat dibuka dari sesi yang Anda ampu."
        actionLabel="Kembali ke jadwal"
        onAction={() => router.replace('/asisten')}
      />
    </SafeAreaView>
  );

  if (!practicumId) {
    return renderFallback();
  }

  if (loading) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingState label="Memuat rekap kehadiran…" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <ErrorState message={error} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (!practicum || !session) {
    return renderFallback();
  }

  // Authorisasi: hanya asisten pengampu yang dapat melihat rekap.
  if (practicum.assistantId !== profile?.uid) {
    return <Redirect href="/asisten" />;
  }

  return <AttendanceRecap practicum={practicum} session={session} />;
}

const styles = {
  container: { flex: 1, justifyContent: 'center' as const, padding: Spacing.three },
};
