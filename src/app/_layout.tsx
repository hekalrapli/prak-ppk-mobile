import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ToastProvider } from '@/components/ui/toast-provider';
import { Colors } from '@/constants/theme';
import { DemoProvider } from '@/store/demo-data-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <DemoProvider>
        <ToastProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <AnimatedSplashOverlay />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.background },
            }}
          />
        </ToastProvider>
      </DemoProvider>
    </ThemeProvider>
  );
}
