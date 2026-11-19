import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthGate } from '@/components/auth/auth-gate';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { ToastProvider } from '@/components/ui/toast-provider';
import { Colors } from '@/constants/theme';
import { useNotificationObserver } from '@/hooks/use-push-notifications';
import { AuthProvider } from '@/store/auth-context';
import { ThemeModeProvider, useThemeMode } from '@/store/theme-context';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

function NotificationObserver() {
  useNotificationObserver();
  return null;
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <RootContent />
    </ThemeModeProvider>
  );
}

function RootContent() {
  const { scheme, ready } = useThemeMode();
  const isDark = scheme === 'dark';
  const theme = Colors[scheme];

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: theme.background,
      card: theme.surface,
      text: theme.textPrimary,
      border: theme.border,
      primary: theme.primary,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <OfflineBanner />
          <AuthGate />
          <NotificationObserver />
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
