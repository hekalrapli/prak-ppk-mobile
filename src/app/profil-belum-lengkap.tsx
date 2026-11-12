import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';

export default function ProfileMissingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { logout } = useAuth();
  const [leaving, setLeaving] = useState(false);

  const handleLogout = async () => {
    if (leaving) {
      return;
    }

    setLeaving(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <EmptyState
          actionLabel={leaving ? 'Keluar…' : 'Keluar'}
          description="Akun ini berhasil login, tetapi dokumen profil users/{uid} belum ada atau belum berisi peran. Hubungi pengelola untuk melengkapi profil, lalu masuk kembali."
          onAction={handleLogout}
          title="Profil pengguna belum lengkap"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.three },
});
