import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthGate } from '@/components/auth/auth-gate';
import { ToastProvider } from '@/components/ui/toast-provider';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/store/auth-context';
import { DemoProvider } from '@/store/demo-data-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <DemoProvider>
        <AuthProvider>
          <ToastProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <AnimatedSplashOverlay />
            <AuthGate />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.background },
              }}
            />
          </ToastProvider>
        </AuthProvider>
      </DemoProvider>
    </ThemeProvider>
  );
}
