import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

interface ToastProps {
  visible: boolean;
  message: string;
  detail?: string;
  tone?: 'success' | 'error';
  onDismiss: () => void;
}

export function Toast({
  visible,
  message,
  detail,
  tone = 'success',
  onDismiss,
}: ToastProps) {
  const theme = useTheme();

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) {
    return null;
  }

  const accentColor = tone === 'success' ? theme.success : theme.error;
  const accentBackground = tone === 'success' ? theme.successSoft : theme.errorSoft;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      pointerEvents="none"
      style={styles.wrapper}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.surface, borderColor: accentColor },
        ]}>
        <View style={[styles.icon, { backgroundColor: accentBackground }]}>
          <Text style={[styles.iconLabel, { color: accentColor }]}>
            {tone === 'success' ? '✓' : '!'}
          </Text>
        </View>
        <View style={styles.body}>
          <Text style={[styles.message, { color: theme.textPrimary }]}>{message}</Text>
          {detail ? (
            <Text style={[styles.detail, { color: theme.textSecondary }]}>{detail}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: { fontSize: 18, fontWeight: '700', lineHeight: 22 },
  body: { flex: 1, gap: Spacing.half },
  message: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  detail: { fontSize: 14, lineHeight: 20 },
});
