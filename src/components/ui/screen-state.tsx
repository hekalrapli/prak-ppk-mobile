import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppButton } from './app-button';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Memuat data…' }: LoadingStateProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      style={styles.container}>
      <ActivityIndicator color={theme.primary} />
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Tidak dapat memuat data',
  message,
  onRetry,
  retryLabel = 'Coba lagi',
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <AppButton label={retryLabel} onPress={onRetry} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  label: { ...Typography.label, fontWeight: '400' },
  title: { ...Typography.sectionTitle, textAlign: 'center' },
  message: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 420,
  },
  action: { alignSelf: 'stretch', maxWidth: 320, marginTop: Spacing.two },
});
