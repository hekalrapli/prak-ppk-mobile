import { Stack } from 'expo-router';

import { RoleGuard } from '@/components/auth/role-guard';
import { useTheme } from '@/hooks/use-theme';

export default function AsistenLayout() {
  const theme = useTheme();

  return (
    <RoleGuard role="asisten">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerTintColor: theme.textPrimary,
          headerTitleStyle: { fontSize: 19, fontWeight: '600' },
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="practicum/form"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="practicum/[practicumId]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="session/form"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="session/[sessionId]/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="session/[sessionId]/recap"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="labs/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="labs/form"
          options={{ headerShown: false }}
        />
      </Stack>
    </RoleGuard>
  );
}
