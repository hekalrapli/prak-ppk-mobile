import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

interface AppTextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  helper?: string;
  required?: boolean;
}

/**
 * Labeled text input sesuai DESIGN.md §7.6.4:
 * label + 8 px gap + field + helper/error caption.
 */
export function AppTextField({
  label,
  error,
  helper,
  required = false,
  editable = true,
  onFocus,
  onBlur,
  style,
  ...inputProps
}: AppTextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.error
    : focused
      ? theme.primary
      : theme.border;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textPrimary }]}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <TextInput
        {...inputProps}
        editable={editable}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor={theme.textTertiary}
        style={[
          styles.input,
          {
            backgroundColor: editable ? theme.surface : theme.disabledBg,
            borderColor,
            color: editable ? theme.textPrimary : theme.disabledText,
          },
          style,
        ]}
      />
      {error ? (
        <Text style={[styles.caption, { color: theme.error }]}>{error}</Text>
      ) : helper ? (
        <Text style={[styles.caption, { color: theme.textSecondary }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 22,
  },
  caption: { fontSize: 12, lineHeight: 16 },
});
