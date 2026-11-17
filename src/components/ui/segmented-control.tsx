import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

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
        { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
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
            style={[
              styles.segment,
              selected && {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}>
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: selected ? theme.textPrimary : theme.textSecondary },
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
    borderRadius: Radius.md,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
