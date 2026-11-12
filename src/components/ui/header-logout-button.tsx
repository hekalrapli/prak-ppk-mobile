import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { useAuth } from '../../store/auth-context';

export function HeaderLogoutButton() {
  const theme = useTheme();
  const { logout } = useAuth();
  const [pending, setPending] = useState(false);

  const handlePress = async () => {
    if (pending) {
      return;
    }

    setPending(true);
    try {
      await logout();
    } finally {
      setPending(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Keluar dari akun"
      disabled={pending}
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={[styles.label, { color: theme.primary }]}>
        {pending ? 'Keluar…' : 'Keluar'}
      </Text>
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
