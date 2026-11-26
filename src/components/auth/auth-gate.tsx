import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAuth } from '@/store/auth-context';

/** Durasi minimal layar pembuka bermerek saat cold start (~2,5 detik) agar transisi mulus. */
export const BRAND_SPLASH_MIN_MS = 2500;

/**
 * Gerbang autentikasi:
 * - Belum login -> diarahkan ke /login.
 * - Sudah login tetapi profil `users/{uid}` belum ada -> /profil-belum-lengkap.
 * - Sudah login dan profil tersedia -> beranda sesuai peran (tanpa memilih peran).
 */
export function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { user, profile, initializing, profileLoading } = useAuth();
  const [brandSplashDone, setBrandSplashDone] = useState(false);

  const segmentKey = segments.join('/');
  const inAuthGroup = segmentKey.startsWith('(auth)');
  const onProfileMissing = segmentKey === 'profil-belum-lengkap';
  const atRoot = segmentKey === '';

  useEffect(() => {
    const timer = setTimeout(() => {
      setBrandSplashDone(true);
    }, BRAND_SPLASH_MIN_MS);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (initializing || (atRoot && !brandSplashDone)) {
      return;
    }

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/login');
      }
      return;
    }

    if (profileLoading) {
      return;
    }

    if (!profile) {
      if (!onProfileMissing) {
        router.replace('/profil-belum-lengkap');
      }
      return;
    }

    if (inAuthGroup || onProfileMissing || atRoot) {
      router.replace(
        profile.role === 'praktikan'
          ? '/praktikan'
          : profile.role === 'aslab'
            ? '/aslab'
            : '/asisten'
      );
    }
  }, [
    user,
    profile,
    initializing,
    profileLoading,
    brandSplashDone,
    inAuthGroup,
    onProfileMissing,
    atRoot,
    router,
  ]);

  return null;
}
