import { Colors } from '@/constants/theme';
import { useThemeMode } from '@/store/theme-context';

export function useTheme() {
  const { scheme } = useThemeMode();

  return Colors[scheme];
}
