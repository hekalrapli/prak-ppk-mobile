import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderStrong },
      ]}>
      {options.map((option) => {
        const selected = option.value === value;
        const label =
          option.count && option.count > 0
            ? `${option.label} (${option.count})`
            : option.label;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && [
                styles.segmentSelected,
                { backgroundColor: theme.primary },
                Shadow.soft,
              ],
              !selected && pressed && { opacity: 0.72 },
            ]}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: selected ? theme.onPrimary : theme.textSecondary,
                  fontWeight: selected ? '700' : '600',
                },
              ]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.pill,
    padding: Spacing.one,
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  segmentSelected: {
    borderWidth: 0,
  },
  label: {
    ...Typography.label,
  },
});
