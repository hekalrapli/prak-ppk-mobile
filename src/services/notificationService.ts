// src/services/notificationService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  addPushTokenListener,
  AndroidImportance,
  getExpoPushTokenAsync,
  getLastNotificationResponseAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { db } from './firebase';

export const DEFAULT_NOTIFICATION_CHANNEL_ID = 'default';
export const MAX_FCM_TOKENS_PER_USER = 5;
export const MIN_EXPO_PUSH_TOKEN_LENGTH = 20;
export const MAX_EXPO_PUSH_TOKEN_LENGTH = 120;

const EXPO_PUSH_TOKEN_REGEX = /^ExponentPushToken\[.+\]$/;
const FALLBACK_EAS_PROJECT_ID = '424ffacd-ce35-4722-be6e-a57a6ec91a5d';
const STORED_PUSH_TOKEN_KEY = '@prakpresensi:expo_push_token';

let handlerConfigured = false;
let activePushToken: string | null = null;
let activeUserId: string | null = null;
let isUnregistering = false;
let lastNativeTokenEvent: string | null = null;
let pendingRegistrationPromise: Promise<PushRegistrationResult> | null = null;
let activeRefreshSubscription: { remove: () => void } | null = null;

export interface NotificationTargetPayload {
  sessionId?: string;
  practicumId?: string;
  fineId?: string;
  orderId?: string;
  type?:
    | 'session_opened'
    | 'schedule_modified'
    | 'leave_decision'
    | 'fine_created'
    | 'payment_success'
    | 'payment_failed'
    | string;
}

export interface ForegroundNotificationPayload {
  id: string;
  title: string;
  body: string;
  data: NotificationTargetPayload;
}

export interface PushRegistrationResult {
  granted: boolean;
  token: string | null;
  reason?: string;
}

/**
 * Validasi format Expo Push Token sesuai aturan Firestore (`ExponentPushToken[...]`,
 * panjang 20–120 karakter).
 */
export function isValidExpoPushToken(token: unknown): token is string {
  return (
    typeof token === 'string' &&
    token.length >= MIN_EXPO_PUSH_TOKEN_LENGTH &&
    token.length <= MAX_EXPO_PUSH_TOKEN_LENGTH &&
    EXPO_PUSH_TOKEN_REGEX.test(token)
  );
}

/**
 * FR-P2-01: Mengatur perilaku notifikasi saat aplikasi sedang terbuka (foreground)
 * agar tetap menampilkan banner sistem dan memutar suara notifikasi.
 */
export function configureForegroundNotificationHandler(): void {
  if (handlerConfigured || Platform.OS === 'web') {
    return;
  }

  try {
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  } catch {
    // Abaikan bila dijalankan di lingkungan yang tidak mendukung native notification handler.
  }
}

/**
 * Wajib dipanggil pada Android (terutama Android 13+) sebelum meminta izin
 * notifikasi dan sebelum mengambil push token.
 */
export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await setNotificationChannelAsync(DEFAULT_NOTIFICATION_CHANNEL_ID, {
      name: 'Notifikasi Praktikum',
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9492B',
    });
  } catch {
    // Abaikan bila channel tidak dapat dibuat (mis. lingkungan non-native).
  }
}

/**
 * Meminta izin notifikasi secara aman. Penolakan izin tidak pernah melempar error
 * maupun membuat aplikasi crash.
 */
export async function requestNotificationPermission(): Promise<{
  granted: boolean;
  status: string;
}> {
  if (Platform.OS === 'web') {
    return { granted: false, status: 'unavailable' };
  }

  try {
    await ensureAndroidNotificationChannel();

    const current = await getPermissionsAsync();
    if (current.granted || current.status === 'granted') {
      return { granted: true, status: 'granted' };
    }

    if (current.canAskAgain === false) {
      return { granted: false, status: current.status ?? 'denied' };
    }

    const requested = await requestPermissionsAsync();
    const granted = requested.granted || requested.status === 'granted';
    return { granted, status: requested.status ?? (granted ? 'granted' : 'denied') };
  } catch {
    return { granted: false, status: 'error' };
  }
}

function resolveEasProjectId(): string | undefined {
  const fromEasConfig = Constants.easConfig?.projectId;
  if (typeof fromEasConfig === 'string' && fromEasConfig.trim().length > 0) {
    return fromEasConfig.trim();
  }

  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const fromExtra = extra?.eas?.projectId;
  if (typeof fromExtra === 'string' && fromExtra.trim().length > 0) {
    return fromExtra.trim();
  }

  return FALLBACK_EAS_PROJECT_ID;
}

/**
 * Mengambil Expo Push Token (`ExponentPushToken[...]`).
 * Mengembalikan null secara aman bila berjalan di simulator tanpa dukungan push,
 * Expo Go, atau sebelum `google-services.json` dipasang di development build.
 */
export async function fetchExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  if (Platform.OS === 'ios' && !Device.isDevice) {
    return null;
  }

  try {
    await ensureAndroidNotificationChannel();
    const projectId = resolveEasProjectId();
    const response = await getExpoPushTokenAsync({ projectId });
    const token = response?.data?.trim() ?? '';
    return isValidExpoPushToken(token) ? token : null;
  } catch (error) {
    console.warn(
      '[PushNotification] Gagal mengambil Expo Push Token:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Menyimpan Expo Push Token ke field `fcm_tokens` pada dokumen `users/{uid}`.
 * Menjaga agar seluruh elemen valid dan jumlahnya tidak melebihi `MAX_FCM_TOKENS_PER_USER` (5).
 */
export async function saveUserPushToken(
  uid: string,
  token: string,
  previousToken?: string | null
): Promise<void> {
  if (!uid || isUnregistering || activeUserId !== uid || !isValidExpoPushToken(token)) {
    return;
  }

  const userRef = doc(db, 'users', uid);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists() || isUnregistering || activeUserId !== uid) {
      return;
    }

    const rawTokens = snap.data()?.fcm_tokens;
    const existingTokens = Array.isArray(rawTokens)
      ? rawTokens.filter(isValidExpoPushToken)
      : [];

    const alreadyRegistered = existingTokens.includes(token);
    const hasPrevious = Boolean(
      previousToken && existingTokens.includes(previousToken)
    );

    if (alreadyRegistered && !hasPrevious && existingTokens.length <= MAX_FCM_TOKENS_PER_USER) {
      return;
    }

    if (
      !hasPrevious &&
      !alreadyRegistered &&
      existingTokens.length < MAX_FCM_TOKENS_PER_USER
    ) {
      await updateDoc(userRef, {
        fcm_tokens: arrayUnion(token),
      });
      return;
    }

    const filtered = existingTokens.filter(
      (item) => item !== token && item !== previousToken
    );
    const trimmed = filtered.slice(-(MAX_FCM_TOKENS_PER_USER - 1));
    const nextTokens = [...trimmed, token];

    await updateDoc(userRef, {
      fcm_tokens: nextTokens,
    });
  } catch {
    if (isUnregistering || activeUserId !== uid) {
      return;
    }
    // Fallback offline/cache: gunakan arrayUnion bila pembacaan awal gagal.
    try {
      await updateDoc(userRef, {
        fcm_tokens: arrayUnion(token),
      });
    } catch (error) {
      console.warn(
        '[PushNotification] Gagal menyimpan fcm_tokens ke Firestore:',
        error instanceof Error ? error.message : error
      );
    }
  }
}

async function performUserPushRegistration(
  uid: string
): Promise<PushRegistrationResult> {
  configureForegroundNotificationHandler();

  const permission = await requestNotificationPermission();
  if (!permission.granted || isUnregistering || activeUserId !== uid) {
    console.warn(
      `[PushNotification] Registrasi dilewati untuk ${uid}: izin=${permission.status}`
    );
    return {
      granted: false,
      token: null,
      reason: `permission-${permission.status}`,
    };
  }

  const token = await fetchExpoPushToken();
  if (!token || isUnregistering || activeUserId !== uid) {
    console.warn(
      `[PushNotification] Token tidak tersedia untuk ${uid} (isDevice=${Device.isDevice}).`
    );
    return {
      granted: true,
      token: null,
      reason: Device.isDevice ? 'token-unavailable' : 'not-physical-device',
    };
  }

  const previousToken =
    activePushToken ??
    (await AsyncStorage.getItem(STORED_PUSH_TOKEN_KEY).catch(() => null));
  if (isUnregistering || activeUserId !== uid) {
    return { granted: false, token: null, reason: 'cancelled' };
  }

  activePushToken = token;
  await AsyncStorage.setItem(STORED_PUSH_TOKEN_KEY, token).catch(() => undefined);
  await saveUserPushToken(uid, token, previousToken);
  console.info(`[PushNotification] Token berhasil diproses untuk users/${uid}.`);

  return { granted: true, token };
}

/**
 * FR-P2-01: Meminta izin notifikasi saat login, mengambil Expo Push Token,
 * dan menyimpannya ke `users/{uid}.fcm_tokens`.
 */
export async function registerUserPushNotifications(
  uid: string
): Promise<PushRegistrationResult> {
  if (!uid) {
    return { granted: false, token: null, reason: 'missing-uid' };
  }

  isUnregistering = false;
  activeUserId = uid;

  const task = performUserPushRegistration(uid);
  pendingRegistrationPromise = task;
  try {
    return await task;
  } finally {
    if (pendingRegistrationPromise === task) {
      pendingRegistrationPromise = null;
    }
  }
}

/**
 * Mendengarkan pembaruan token perangkat dari OS selama pengguna sedang login,
 * lalu memperbarui `users/{uid}.fcm_tokens`.
 */
export function subscribePushTokenRefresh(uid: string): () => void {
  if (!uid || Platform.OS === 'web') {
    return () => {};
  }

  activeRefreshSubscription?.remove();
  activeRefreshSubscription = null;

  try {
    const subscription = addPushTokenListener(async (event) => {
      if (isUnregistering || activeUserId !== uid) {
        return;
      }

      const rawData = typeof event?.data === 'string' ? event.data.trim() : '';
      if (!rawData || rawData === lastNativeTokenEvent) {
        return;
      }
      lastNativeTokenEvent = rawData;

      // Hanya proses bila sudah selesai registrasi awal dan event membawa perubahan.
      if (!activePushToken) {
        return;
      }

      const candidate = isValidExpoPushToken(rawData)
        ? rawData
        : await fetchExpoPushToken();

      if (
        !candidate ||
        candidate === activePushToken ||
        isUnregistering ||
        activeUserId !== uid
      ) {
        return;
      }

      const previous =
        activePushToken ??
        (await AsyncStorage.getItem(STORED_PUSH_TOKEN_KEY).catch(() => null));
      activePushToken = candidate;
      await AsyncStorage.setItem(STORED_PUSH_TOKEN_KEY, candidate).catch(
        () => undefined
      );
      await saveUserPushToken(uid, candidate, previous);
    });

    activeRefreshSubscription = subscription;

    return () => {
      subscription.remove();
      if (activeRefreshSubscription === subscription) {
        activeRefreshSubscription = null;
      }
    };
  } catch {
    return () => {};
  }
}

/**
 * FR-P2-01: Menghapus token perangkat saat ini dari `users/{uid}.fcm_tokens`
 * menggunakan `arrayRemove` sebelum `signOut(auth)` dijalankan.
 */
export async function unregisterUserPushToken(uid?: string): Promise<void> {
  const targetUid = uid ?? activeUserId;
  isUnregistering = true;
  activeUserId = null;

  activeRefreshSubscription?.remove();
  activeRefreshSubscription = null;

  if (pendingRegistrationPromise) {
    await pendingRegistrationPromise.catch(() => undefined);
    pendingRegistrationPromise = null;
  }

  let tokenToRemove = activePushToken;
  activePushToken = null;
  lastNativeTokenEvent = null;

  if (Platform.OS === 'web') {
    isUnregistering = false;
    return;
  }

  if (!tokenToRemove) {
    tokenToRemove = await AsyncStorage.getItem(STORED_PUSH_TOKEN_KEY).catch(
      () => null
    );
  }
  if (!tokenToRemove) {
    tokenToRemove = await fetchExpoPushToken();
  }

  await AsyncStorage.removeItem(STORED_PUSH_TOKEN_KEY).catch(() => undefined);

  if (!targetUid || !tokenToRemove) {
    isUnregistering = false;
    return;
  }

  try {
    await updateDoc(doc(db, 'users', targetUid), {
      fcm_tokens: arrayRemove(tokenToRemove),
    });
  } catch (error) {
    console.warn(
      '[PushNotification] Gagal menghapus fcm_tokens saat logout:',
      error instanceof Error ? error.message : error
    );
  } finally {
    isUnregistering = false;
  }
}

function parseTargetPayload(raw: unknown): NotificationTargetPayload {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const record = raw as Record<string, unknown>;
  return {
    sessionId:
      typeof record.sessionId === 'string'
        ? record.sessionId
        : typeof record.session_id === 'string'
          ? record.session_id
          : undefined,
    practicumId:
      typeof record.practicumId === 'string'
        ? record.practicumId
        : typeof record.practicum_id === 'string'
          ? record.practicum_id
          : undefined,
    fineId:
      typeof record.fineId === 'string'
        ? record.fineId
        : typeof record.fine_id === 'string'
          ? record.fine_id
          : undefined,
    orderId:
      typeof record.orderId === 'string'
        ? record.orderId
        : typeof record.order_id === 'string'
          ? record.order_id
          : undefined,
    type: typeof record.type === 'string' ? record.type : undefined,
  };
}

/**
 * Listener notifikasi saat aplikasi sedang di foreground (untuk menampilkan in-app toast/banner).
 */
export function subscribeForegroundNotifications(
  onNotification: (payload: ForegroundNotificationPayload) => void
): () => void {
  if (Platform.OS === 'web') {
    return () => {};
  }

  configureForegroundNotificationHandler();

  try {
    const subscription = addNotificationReceivedListener(
      (notification) => {
        const content = notification.request.content;
        onNotification({
          id: notification.request.identifier,
          title: content.title?.trim() || 'Notifikasi Praktikum',
          body: content.body?.trim() || '',
          data: parseTargetPayload(content.data),
        });
      }
    );

    return () => {
      subscription.remove();
    };
  } catch {
    return () => {};
  }
}

/**
 * Listener saat pengguna mengetuk notifikasi (baik dari background maupun cold start).
 */
export function subscribeNotificationResponses(
  onTap: (target: NotificationTargetPayload, responseId: string) => void
): () => void {
  if (Platform.OS === 'web') {
    return () => {};
  }

  let active = true;

  getLastNotificationResponseAsync()
    .then((lastResponse) => {
      if (!active || !lastResponse) return;
      const target = parseTargetPayload(
        lastResponse.notification.request.content.data
      );
      onTap(target, lastResponse.notification.request.identifier);
    })
    .catch(() => undefined);

  try {
    const subscription = addNotificationResponseReceivedListener(
      (response) => {
        if (!active) return;
        const target = parseTargetPayload(
          response.notification.request.content.data
        );
        onTap(target, response.notification.request.identifier);
      }
    );

    return () => {
      active = false;
      subscription.remove();
    };
  } catch {
    return () => {
      active = false;
    };
  }
}
