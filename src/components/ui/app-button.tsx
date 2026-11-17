import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
}

export const AppButton: React.FC<AppButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}) => {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const textColor = isDisabled
    ? theme.disabledText
    : variant === 'secondary'
      ? theme.textPrimary
      : theme.onPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        variant === 'primary' && {
          backgroundColor: pressed ? theme.primaryPressed : theme.primary,
        },
        variant === 'secondary' && {
          backgroundColor: pressed ? theme.surfacePressed : theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        },
        variant === 'destructive' && {
          backgroundColor: theme.error,
          opacity: pressed ? 0.88 : 1,
        },
        isDisabled && { backgroundColor: theme.disabledBg, borderWidth: 0 },
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 52,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
  },
  text: {
    ...Typography.button,
  },
});
