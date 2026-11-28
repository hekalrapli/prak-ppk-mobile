import { Stack } from 'expo-router';

import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useTheme } from '@/hooks/use-theme';

export default function AuthLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.surfaceWarm },
        headerShadowVisible: false,
        headerTintColor: theme.textPrimary,
        headerTitleStyle: { fontSize: 19, fontWeight: '600' },
        headerRight: () => <ThemeToggle />,
        contentStyle: { backgroundColor: theme.surfaceWarm },
      }}>
      <Stack.Screen
        name="login"
        options={{ title: 'Masuk', headerBackVisible: false }}
      />
      <Stack.Screen name="register" options={{ title: 'Daftar Akun' }} />
    </Stack>
  );
}
