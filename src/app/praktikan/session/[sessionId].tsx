import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionDetail } from '@/components/attendance/session-detail';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { Spacing } from '@/constants/theme';
import { useSessionDetail } from '@/hooks/use-session-detail';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';

export default function PraktikanSessionScreen() {
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
        description="Sesi yang Anda cari tidak tersedia. Kembali ke jadwal untuk memilih sesi lain."
        actionLabel="Kembali ke jadwal"
        onAction={() => router.replace('/praktikan')}
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
        <LoadingState label="Memuat sesi…" />
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

  // Authorisasi: praktikan hanya boleh membuka sesi praktikum yang diikutinya.
  if (!profile || !practicum.studentIds?.includes(profile.uid)) {
    return <Redirect href="/praktikan" />;
  }

  return <SessionDetail role="praktikan" practicum={practicum} session={session} />;
}

const styles = {
  container: { flex: 1, justifyContent: 'center' as const, padding: Spacing.three },
};
