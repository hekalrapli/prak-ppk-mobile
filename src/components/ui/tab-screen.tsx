import { usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
 * Kerangka layar tab: app bar (avatar inisial menuju Profil + judul + toggle tema)
 * dan konten. Menekan avatar langsung membuka tab Profil sesuai peran.
 */
export function TabScreen({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const { profile } = useAuth();

  const profileRoute =
    profile?.role === 'asisten'
      ? '/asisten/profile'
      : profile?.role === 'aslab'
        ? '/aslab/profile'
        : profile?.role === 'praktikan'
          ? '/praktikan/profile'
          : null;
  const isOnProfile = profileRoute !== null && pathname === profileRoute;

  const handleOpenProfile = () => {
    if (!profileRoute || isOnProfile) {
      return;
    }
    router.navigate(profileRoute);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={title}
        left={
          <Pressable
            accessibilityLabel={
              isOnProfile
                ? `Profil ${profile?.name ?? 'Pengguna'}`
                : 'Buka profil'
            }
            accessibilityRole="button"
            accessibilityState={{ selected: isOnProfile }}
            disabled={!profileRoute || isOnProfile}
            hitSlop={4}
            onPress={handleOpenProfile}
            style={({ pressed }) => [
              styles.avatarButton,
              pressed && !isOnProfile && { opacity: 0.72 },
            ]}>
            <View
              style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.initials, { color: theme.textPrimary }]}>
                {initialsOf(profile?.name ?? '') || '—'}
              </Text>
            </View>
          </Pressable>
        }
        right={<ThemeToggle />}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  avatarButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { ...Typography.label, fontWeight: '700' },
});
