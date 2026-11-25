import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SessionDetail } from '@/components/attendance/session-detail';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { Spacing } from '@/constants/theme';
import { useSessionDetail } from '@/hooks/use-session-detail';
import { useAuth } from '@/store/auth-context';

export default function PraktikanSessionScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { sessionId, practicumId, tab } = useLocalSearchParams<{
    sessionId: string;
    practicumId?: string;
    tab?: string;
  }>();

  const { practicum, session, loading, error, retry } = useSessionDetail(
    practicumId,
    sessionId
  );

  const renderFallback = () => (
    <DetailScreen title="Detail Sesi">
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
      <DetailScreen title="Detail Sesi">
        <View style={styles.fallback}>
          <LoadingState label="Memuat sesi…" />
        </View>
      </DetailScreen>
    );
  }

  if (error) {
    return (
      <DetailScreen title="Detail Sesi">
        <View style={styles.fallback}>
          <ErrorState message={error} onRetry={retry} />
        </View>
      </DetailScreen>
    );
  }

  if (!practicum || !session) {
    return renderFallback();
  }

  // Authorisasi: praktikan hanya boleh membuka sesi praktikum yang diikutinya.
  if (!profile || !practicum.studentIds?.includes(profile.uid)) {
    return <Redirect href="/praktikan" />;
  }

  return (
    <DetailScreen title="Detail Sesi">
      <SessionDetail
        role="praktikan"
        practicum={practicum}
        session={session}
        initialTab={tab === 'izin' ? 'izin' : undefined}
      />
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, justifyContent: 'center', padding: Spacing.three },
});
