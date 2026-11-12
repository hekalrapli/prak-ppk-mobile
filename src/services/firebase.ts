// src/services/firebase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Config diambil dari file .env (variabel EXPO_PUBLIC_* otomatis tersedia di Expo).
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Catatan: getAnalytics() sengaja tidak dipakai. Firebase Analytics versi web
// tidak berjalan di React Native/Expo Go dan akan menyebabkan error.

const isNew = getApps().length === 0;

export const app = isNew ? initializeApp(firebaseConfig) : getApp();

// Auth dengan persistence AsyncStorage agar pengguna tetap login setelah aplikasi ditutup.
export const auth =
  isNew && Platform.OS !== 'web'
    ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
    : getAuth(app);

export const db = getFirestore(app);