import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuth } from '@/store/auth-context';
import { useDemoData } from '@/store/demo-data-context';

/**
 * Gerbang autentikasi:
 * - Belum login -> diarahkan ke /login.
 * - Sudah login tetapi profil `users/{uid}` belum ada -> /profil-belum-lengkap.
 * - Sudah login dan profil tersedia -> beranda sesuai peran (tanpa memilih peran).
 *
 * Komponen ini juga menyinkronkan identitas Firebase ke state demo sementara
 * agar layar Sprint 1 mengenali pengguna yang sedang login.
 */
export function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { user, profile, initializing, profileLoading } = useAuth();
  const { dispatch } = useDemoData();

  const segmentKey = segments.join('/');
  const inAuthGroup = segmentKey.startsWith('(auth)');
  const onProfileMissing = segmentKey === 'profil-belum-lengkap';
  const atRoot = segmentKey === '';

  useEffect(() => {
    if (profile) {
      dispatch({
        type: 'REGISTER_IDENTITY',
        payload: {
          user: {
            id: profile.uid,
            name: profile.name,
            identifier: profile.identifier,
            role: profile.role,
          },
        },
      });
    }
  }, [profile, dispatch]);

  useEffect(() => {
    if (!user) {
      dispatch({ type: 'RESET_IDENTITY' });
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (initializing) {
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
      router.replace(profile.role === 'praktikan' ? '/praktikan' : '/asisten');
    }
  }, [
    user,
    profile,
    initializing,
    profileLoading,
    inAuthGroup,
    onProfileMissing,
    atRoot,
    router,
  ]);

  return null;
}
