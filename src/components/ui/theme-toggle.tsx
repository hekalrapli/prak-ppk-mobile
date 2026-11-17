import { SymbolView } from 'expo-symbols';
import { StyleSheet, Switch, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/store/theme-context';

/**
 * Sakelar tema di header setiap tab: terang <-> gelap.
 * Pilihan disimpan oleh ThemeModeProvider sehingga tetap berlaku
 * setelah aplikasi ditutup.
 */
export function ThemeToggle() {
  const theme = useTheme();
  const { scheme, setMode } = useThemeMode();
  const isDark = scheme === 'dark';

  return (
    <View style={styles.container}>
      <SymbolView
        name={
          isDark
            ? { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' }
            : { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' }
        }
        size={16}
        tintColor={theme.textSecondary}
      />
      <Switch
        accessibilityLabel="Mode gelap"
        accessibilityRole="switch"
        accessibilityState={{ checked: isDark }}
        ios_backgroundColor={theme.borderStrong}
        onValueChange={(value) => setMode(value ? 'dark' : 'light')}
        thumbColor={isDark ? theme.background : theme.surface}
        trackColor={{ false: theme.borderStrong, true: theme.primary }}
        value={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
});
