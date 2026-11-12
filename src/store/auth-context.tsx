import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { registerUser, loginUser, logoutUser, RegisterInput } from '../services/auth';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types/auth';

interface AuthContextValue {
  /** Akun Firebase Auth yang sedang login, null jika belum login. */
  user: User | null;
  /** Profil `users/{uid}`; null saat belum login atau dokumen belum tersedia. */
  profile: UserProfile | null;
  /** True selama status auth pertama kali masih diproses. */
  initializing: boolean;
  /** True selama profil pengguna yang login masih dimuat. */
  profileLoading: boolean;
  register: (input: RegisterInput) => Promise<UserProfile>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;

      setUser(nextUser);
      setProfile(null);

      if (!nextUser) {
        setProfileLoading(false);
        setInitializing(false);
        return;
      }

      setProfileLoading(true);

      unsubscribeProfile = onSnapshot(
        doc(db, 'users', nextUser.uid),
        (snapshot) => {
          if (!snapshot.exists()) {
            setProfile(null);
            setProfileLoading(false);
            setInitializing(false);
            return;
          }

          const data = snapshot.data();
          const role = data.role === 'asisten' || data.role === 'praktikan' ? data.role : null;

          if (!role) {
            // Dokumen ada tetapi peran tidak valid: perlakukan sebagai profil belum lengkap.
            setProfile(null);
            setProfileLoading(false);
            setInitializing(false);
            return;
          }

          setProfile({
            uid: nextUser.uid,
            name: String(data.name ?? ''),
            identifier: String(data.identifier ?? ''),
            email: String(data.email ?? ''),
            role,
          });
          setProfileLoading(false);
          setInitializing(false);
        },
        () => {
          // Profil tidak dapat dibaca (misalnya belum ada dokumennya).
          setProfile(null);
          setProfileLoading(false);
          setInitializing(false);
        }
      );
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const register = useCallback(async (input: RegisterInput) => registerUser(input), []);
  const login = useCallback(async (email: string, password: string) => {
    await loginUser(email, password);
  }, []);
  const logout = useCallback(async () => {
    await logoutUser();
  }, []);

  const value = useMemo(
    () => ({ user, profile, initializing, profileLoading, register, login, logout }),
    [user, profile, initializing, profileLoading, register, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider');
  }
  return context;
}
