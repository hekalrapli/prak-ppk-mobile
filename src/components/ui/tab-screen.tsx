import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';
import { ScreenHeader } from './screen-header';
import { ThemeToggle } from './theme-toggle';

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Kerangka layar tab: app bar (avatar inisial statis + judul + toggle tema)
 * dan konten. Avatar hanya identitas, bukan tombol.
 */
export function TabScreen({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  const { profile } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={title}
        left={
          <View
            accessible
            accessibilityLabel={profile?.name ?? 'Pengguna'}
            style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.initials, { color: theme.primary }]}>
              {initialsOf(profile?.name ?? '') || '—'}
            </Text>
          </View>
        }
        right={<ThemeToggle />}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { ...Typography.label, fontWeight: '700' },
});
