import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function AuthLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerTintColor: theme.textPrimary,
        headerTitleStyle: { fontSize: 18, fontWeight: '600' },
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen
        name="login"
        options={{ title: 'Masuk', headerBackVisible: false }}
      />
      <Stack.Screen name="register" options={{ title: 'Daftar Akun' }} />
    </Stack>
  );
}
