import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AuthGate } from '@/components/auth/auth-gate';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { ToastProvider } from '@/components/ui/toast-provider';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/store/auth-context';

SplashScreen.setOptions({ duration: 300, fade: true });

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <OfflineBanner />
          <AuthGate />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.background },
            }}
          />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
