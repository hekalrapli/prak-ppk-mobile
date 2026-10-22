import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

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

  const getContainerStyle = () => {
    if (disabled) return [styles.container, { backgroundColor: theme.disabledBg }];
    if (variant === 'secondary') return [styles.container, { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }];
    if (variant === 'destructive') return [styles.container, { backgroundColor: theme.error }];
    return [styles.container, { backgroundColor: theme.primary }];
  };

  const getTextStyle = () => {
    if (disabled) return [styles.text, { color: theme.disabledText }];
    if (variant === 'secondary') return [styles.text, { color: theme.textPrimary }];
    return [styles.text, { color: theme.onPrimary }];
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={getContainerStyle()}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? theme.primary : theme.onPrimary} />
      ) : (
        <Text style={getTextStyle()}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});