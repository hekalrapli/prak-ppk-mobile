import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CircleButtonProps {
  symbol: SymbolViewProps['name'];
  accessibilityLabel: string;
  onPress?: () => void;
  /** `surface` untuk app bar putih, `primary` untuk header koral. */
  tone?: 'surface' | 'primary';
  size?: number;
  accessibilityRole?: 'button' | 'switch';
  accessibilityState?: AccessibilityState;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * Tombol ikon bulat. Dipakai app bar, header detail, dan sakelar tema.
 * Target sentuh minimal 44x44 dengan label aksesibilitas wajib.
 */
export function CircleButton({
  symbol,
  accessibilityLabel,
  onPress,
  tone = 'surface',
  size = 44,
  accessibilityRole = 'button',
  accessibilityState,
  style,
  children,
}: CircleButtonProps) {
  const theme = useTheme();

  const backgroundColor = tone === 'primary' ? 'transparent' : theme.surface;
  const borderColor = tone === 'primary' ? theme.onPrimary : theme.border;
  const tintColor = tone === 'primary' ? theme.onPrimary : theme.textPrimary;

  const content = (
    <View
      style={[
        styles.inner,
        {
          width: size,
          height: size,
          borderRadius: Radius.full,
          backgroundColor,
          borderColor,
        },
      ]}>
      {children ?? (
        <SymbolView
          name={symbol}
          size={Math.round(size * 0.45)}
          tintColor={tintColor}
        />
      )}
    </View>
  );

  if (!onPress) {
    return <View style={style}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pressed: { opacity: 0.72 },
});
