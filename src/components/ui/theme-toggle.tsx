import { useThemeMode } from '@/store/theme-context';
import { CircleButton } from './circle-button';

/**
 * Sakelar tema di app bar setiap tab: terang <-> gelap.
 * Pilihan disimpan oleh ThemeModeProvider sehingga tetap berlaku
 * setelah aplikasi ditutup. Semantiknya tetap switch.
 */
export function ThemeToggle() {
  const { scheme, setMode } = useThemeMode();
  const isDark = scheme === 'dark';

  return (
    <CircleButton
      accessibilityLabel={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      onPress={() => setMode(isDark ? 'light' : 'dark')}
      symbol={
        isDark
          ? { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' }
          : { ios: 'sun.max.fill', android: 'light_mode', web: 'light_mode' }
      }
    />
  );
}
