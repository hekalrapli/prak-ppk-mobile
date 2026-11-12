import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { UserProfile } from '../types/auth';
import { auth, db } from './firebase';

export interface RegisterInput {
  name: string;
  identifier: string;
  email: string;
  password: string;
  role: UserProfile['role'];
  inviteCode?: string;
}

function errorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  return '';
}

function mapAuthError(error: unknown) {
  switch (errorCode(error)) {
    case 'auth/email-already-in-use':
      return 'Email sudah digunakan.';
    case 'auth/invalid-email':
      return 'Format email tidak valid.';
    case 'auth/weak-password':
      return 'Kata sandi minimal 8 karakter.';
    case 'auth/network-request-failed':
      return 'Tidak ada koneksi internet. Periksa jaringan Anda.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Coba lagi nanti.';
    default:
      return 'Pendaftaran gagal. Coba lagi.';
  }
}

function mapProfileError(error: unknown, role: UserProfile['role']) {
  if (errorCode(error) === 'permission-denied') {
    return role === 'asisten'
      ? 'Kode undangan asisten salah atau tidak valid.'
      : 'Pendaftaran ditolak. Periksa kembali data Anda.';
  }
  return 'Profil gagal disimpan sehingga pendaftaran dibatalkan. Coba lagi.';
}

function mapLoginError(error: unknown) {
  switch (errorCode(error)) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email atau kata sandi salah.';
    case 'auth/invalid-email':
      return 'Format email tidak valid.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan, coba lagi nanti.';
    case 'auth/network-request-failed':
      return 'Tidak ada koneksi internet. Periksa jaringan Anda.';
    case 'auth/user-disabled':
      return 'Akun ini dinonaktifkan.';
    default:
      return 'Login gagal. Coba lagi.';
  }
}

export async function loginUser(email: string, password: string) {
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );
    return credential.user;
  } catch (error) {
    throw new Error(mapLoginError(error));
  }
}

export async function logoutUser() {
  await signOut(auth);
}

/**
 * FR-11: buat akun Firebase Auth lalu simpan profil `users/{uid}`.
 * Jika penyimpanan profil gagal (misalnya kode undangan asisten salah),
 * akun Auth yang baru dibuat dihapus agar tidak ada akun tanpa peran.
 */
export async function registerUser(input: RegisterInput): Promise<UserProfile> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const identifier = input.identifier.trim();

  let credential: UserCredential;
  try {
    credential = await createUserWithEmailAndPassword(auth, email, input.password);
  } catch (error) {
    throw new Error(mapAuthError(error));
  }

  const profile: UserProfile = {
    uid: credential.user.uid,
    name,
    identifier,
    email,
    role: input.role,
  };

  try {
    await setDoc(doc(db, 'users', profile.uid), {
      name: profile.name,
      identifier: profile.identifier,
      email: profile.email,
      role: profile.role,
      createdAt: serverTimestamp(),
      // Firestore Rules memvalidasi nilai ini terhadap config/registration.
      ...(profile.role === 'asisten' ? { inviteCode: input.inviteCode?.trim() ?? '' } : {}),
    });
  } catch (error) {
    await deleteUser(credential.user).catch(() => undefined);
    throw new Error(mapProfileError(error, profile.role));
  }

  return profile;
}
