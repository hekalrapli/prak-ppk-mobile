import { Stack } from 'expo-router';

import { RoleGuard } from '@/components/auth/role-guard';
import { useTheme } from '@/hooks/use-theme';

export default function AslabLayout() {
  const theme = useTheme();

  return (
    <RoleGuard role="aslab">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.textPrimary,
          headerTitleStyle: { fontSize: 19, fontWeight: '600' },
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </RoleGuard>
  );
}
