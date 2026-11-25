import { SymbolView } from 'expo-symbols';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface AppTextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  helper?: string;
  required?: boolean;
}

/**
 * Label + field + helper/error. Field membulat, latar putih, fokus koral.
 * Jika `secureTextEntry` aktif, tombol lihat/sembunyikan kata sandi ditampilkan otomatis.
 */
export function AppTextField({
  label,
  error,
  helper,
  required = false,
  editable = true,
  secureTextEntry,
  onFocus,
  onBlur,
  style,
  ...inputProps
}: AppTextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const isPasswordField = Boolean(secureTextEntry);

  const borderColor = error
    ? theme.error
    : focused
      ? theme.link
      : theme.border;

  const backgroundColor = editable ? theme.surface : theme.disabledBg;
  const textColor = editable ? theme.textPrimary : theme.disabledText;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textPrimary }]}>
        {label}
        {required ? ' *' : ''}
      </Text>

      {isPasswordField ? (
        <View
          style={[
            styles.passwordWrap,
            { backgroundColor, borderColor },
          ]}>
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
            secureTextEntry={!passwordVisible}
            style={[styles.passwordInput, { color: textColor }, style]}
          />
          <Pressable
            accessibilityLabel={
              passwordVisible
                ? 'Sembunyikan kata sandi'
                : 'Tampilkan kata sandi'
            }
            accessibilityRole="button"
            accessibilityState={{ selected: passwordVisible }}
            disabled={!editable}
            hitSlop={4}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={({ pressed }) => [
              styles.eyeButton,
              pressed && editable && { opacity: 0.7 },
            ]}>
            <SymbolView
              name={
                passwordVisible
                  ? {
                      ios: 'eye.slash',
                      android: 'visibility_off',
                      web: 'visibility_off',
                    }
                  : {
                      ios: 'eye',
                      android: 'visibility',
                      web: 'visibility',
                    }
              }
              size={20}
              tintColor={editable ? theme.textSecondary : theme.disabledText}
            />
          </Pressable>
        </View>
      ) : (
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
              backgroundColor,
              borderColor,
              color: textColor,
            },
            style,
          ]}
        />
      )}

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
  label: { ...Typography.label },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    ...Typography.body,
    lineHeight: 24,
  },
  passwordWrap: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    minHeight: 50,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.two,
    ...Typography.body,
    lineHeight: 24,
  },
  eyeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.one,
  },
  caption: { ...Typography.caption },
});
