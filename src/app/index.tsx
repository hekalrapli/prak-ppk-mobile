import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Layar awal sementara. AuthGate akan mengarahkan ke /login atau beranda
 * sesuai peran setelah status autentikasi dan profil selesai dimuat.
 */
export default function EntryScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ActivityIndicator color={theme.primary} size="large" />
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        Menyiapkan sesi…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  label: { fontSize: 14, lineHeight: 20 },
});
