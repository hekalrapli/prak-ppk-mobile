import { Stack } from 'expo-router';

import { HeaderRoleSwitch } from '@/components/ui/header-role-switch';
import { useTheme } from '@/hooks/use-theme';

export default function AsistenLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerTintColor: theme.textPrimary,
        headerTitleStyle: { fontSize: 18, fontWeight: '600' },
        contentStyle: { backgroundColor: theme.background },
        headerRight: () => <HeaderRoleSwitch />,
      }}>
      <Stack.Screen name="index" options={{ title: 'Jadwal' }} />
      <Stack.Screen name="session/[sessionId]/index" options={{ title: 'Kelola Sesi' }} />
      <Stack.Screen name="session/[sessionId]/recap" options={{ title: 'Rekap Kehadiran' }} />
    </Stack>
  );
}
