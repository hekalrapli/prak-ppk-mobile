import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { LoadingState } from '@/components/ui/screen-state';
import { useAuth } from '@/store/auth-context';
import type { UserRole } from '@/types/attendance';

/**
 * Penjaga peran di level layout: satu tempat untuk seluruh layar di dalam
 * grup rute, bukan pengecekan duplikat di setiap layar.
 */
export function RoleGuard({ role, children }: { role: UserRole; children: ReactNode }) {
  const { profile, initializing, profileLoading } = useAuth();

  if (initializing || profileLoading) {
    return <LoadingState label="Memeriksa sesi masuk…" />;
  }

  // AuthGate yang mengarahkan pengguna tanpa profil ke /profil-belum-lengkap.
  if (!profile) {
    return null;
  }

  if (profile.role !== role) {
    return <Redirect href={profile.role === 'praktikan' ? '/praktikan' : '/asisten'} />;
  }

  return <>{children}</>;
}
