import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

export function HeaderRoleSwitch() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ganti peran"
      hitSlop={8}
      onPress={() => router.replace('/')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={[styles.label, { color: theme.primary }]}>Ganti peran</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  label: { fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
