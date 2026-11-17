import { Stack } from 'expo-router';

import { RoleGuard } from '@/components/auth/role-guard';
import { HeaderLogoutButton } from '@/components/ui/header-logout-button';
import { useTheme } from '@/hooks/use-theme';

export default function PraktikanLayout() {
  const theme = useTheme();

  return (
    <RoleGuard role="praktikan">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.textPrimary,
          headerTitleStyle: { fontSize: 18, fontWeight: '600' },
          contentStyle: { backgroundColor: theme.background },
          headerRight: () => <HeaderLogoutButton />,
        }}>
        <Stack.Screen name="index" options={{ title: 'Jadwal' }} />
        <Stack.Screen name="history" options={{ title: 'Riwayat Kehadiran' }} />
        <Stack.Screen name="session/[sessionId]" options={{ title: 'Detail Sesi' }} />
      </Stack>
    </RoleGuard>
  );
}
