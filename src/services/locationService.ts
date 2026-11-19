// src/services/locationService.ts
import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

import type {
  DevicePosition,
  GeoCoordinates,
  Laboratory,
  LocationIssue,
  LocationPermissionState,
} from '../types/location';

/**
 * FR-P1-01: satu pintu untuk semua akses lokasi.
 *
 * Komponen UI tidak boleh memanggil `expo-location` langsung. Semua kegagalan
 * (izin ditolak, GPS mati, timeout, lokasi palsu) dilempar sebagai
 * `LocationServiceError` dengan `issue` yang sudah siap dipetakan ke pesan UI,
 * sehingga layar tidak perlu menebak isi pesan error platform.
 */

const EARTH_RADIUS_METERS = 6_371_008.8;
const DEFAULT_TIMEOUT_MS = 15_000;
const LAST_KNOWN_MAX_AGE_MS = 60_000;
const LAST_KNOWN_REQUIRED_ACCURACY_METERS = 100;

export class LocationServiceError extends Error {
  readonly issue: LocationIssue;
  /** True bila pengguna dapat memperbaiki masalah ini lewat Pengaturan. */
  readonly settingsAvailable: boolean;

  constructor(issue: LocationIssue, message: string, settingsAvailable = false) {
    super(message);
    this.name = 'LocationServiceError';
    this.issue = issue;
    this.settingsAvailable = settingsAvailable;
  }
}

function toLocationServiceError(error: unknown): LocationServiceError {
  if (error instanceof LocationServiceError) {
    return error;
  }
  const message =
    error instanceof Error && error.message ? error.message : 'Lokasi tidak dapat dibaca.';
  return new LocationServiceError('unavailable', message);
}

function assertFiniteCoordinate(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`Koordinat ${label} tidak valid.`);
  }
}

/**
 * Jarak great-circle antara dua koordinat dalam meter (rumus Haversine).
 * Dipakai untuk membandingkan posisi perangkat dengan titik laboratorium.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  assertFiniteCoordinate(lat1, 'latitude awal');
  assertFiniteCoordinate(lon1, 'longitude awal');
  assertFiniteCoordinate(lat2, 'latitude tujuan');
  assertFiniteCoordinate(lon2, 'longitude tujuan');

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2;

  const clamped = Math.min(1, Math.max(0, a));
  const centralAngle = 2 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped));

  return EARTH_RADIUS_METERS * centralAngle;
}

/** Jarak perangkat ke titik laboratorium (meter). */
export function distanceToLaboratory(
  position: GeoCoordinates,
  laboratory: GeoCoordinates
): number {
  return calculateHaversineDistance(
    position.latitude,
    position.longitude,
    laboratory.latitude,
    laboratory.longitude
  );
}

/** Jarak dalam meter dibulatkan ke 1 desimal agar stabil saat ditampilkan. */
export function roundDistanceMeters(distance: number): number {
  return Math.round(distance * 10) / 10;
}

export function isWithinRadius(distanceMeters: number, radiusMeters: number): boolean {
  return Number.isFinite(distanceMeters) && distanceMeters <= radiusMeters;
}

/** Status izin foreground tanpa memunculkan dialog sistem. */
export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  try {
    const response = await Location.getForegroundPermissionsAsync();
    if (response.granted) return 'granted';
    return response.canAskAgain ? 'undetermined' : 'denied';
  } catch (error) {
    throw toLocationServiceError(error);
  }
}

/**
 * Meminta izin lokasi foreground. Mengembalikan `false` (bukan melempar) bila
 * pengguna menolak, agar layar dapat menampilkan panduan tanpa crash.
 */
export async function requestLocationPermission(): Promise<boolean> {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;

    const response = await Location.requestForegroundPermissionsAsync();
    return response.granted;
  } catch (error) {
    throw toLocationServiceError(error);
  }
}

/** True bila layanan lokasi (GPS) perangkat aktif. */
export async function isLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    throw toLocationServiceError(error);
  }
}

/** Membuka Pengaturan aplikasi; tidak tersedia di web (diatur lewat browser). */
export async function openDeviceSettings(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    await Linking.openSettings();
  } catch {
    // Perangkat tanpa aplikasi Pengaturan (mis. emulator tertentu): abaikan.
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new LocationServiceError(
          'timeout',
          'GPS tidak merespons. Pastikan Anda berada di area terbuka lalu coba lagi.'
        )
      );
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function mapPosition(location: Location.LocationObject): DevicePosition {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy:
      typeof location.coords.accuracy === 'number' ? location.coords.accuracy : null,
    timestamp: location.timestamp,
    // `mocked` hanya ada di Android/iOS; di web nilainya undefined.
    mocked: location.mocked === true,
  };
}

/**
 * Membaca posisi perangkat saat ini.
 *
 * Urutan pemeriksaan: izin -> GPS aktif -> pembacaan dengan batas waktu.
 * Bila GPS lambat, posisi terakhir yang masih layak dipakai sebagai fallback
 * agar pengguna tidak menunggu tanpa kepastian.
 */
export async function getCurrentCoordinates(options?: {
  timeoutMs?: number;
  allowLastKnown?: boolean;
}): Promise<DevicePosition> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const allowLastKnown = options?.allowLastKnown ?? true;

  let permission: LocationPermissionState;
  try {
    permission = await getLocationPermissionState();
  } catch (error) {
    throw toLocationServiceError(error);
  }

  if (permission !== 'granted') {
    throw new LocationServiceError(
      'permission-denied',
      'Akses lokasi belum diizinkan. Aktifkan izin lokasi untuk memverifikasi kehadiran.',
      true
    );
  }

  const servicesEnabled = await isLocationServicesEnabled().catch(() => true);
  if (!servicesEnabled) {
    throw new LocationServiceError(
      'services-disabled',
      'Layanan lokasi (GPS) sedang mati. Aktifkan lokasi perangkat lalu coba lagi.',
      true
    );
  }

  try {
    const location = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      timeoutMs
    );
    return mapPosition(location);
  } catch (error) {
    const mapped = toLocationServiceError(error);

    if (allowLastKnown) {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_MAX_AGE_MS,
        requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_METERS,
      }).catch(() => null);

      if (lastKnown) {
        return mapPosition(lastKnown);
      }
    }

    if (mapped.issue === 'timeout') {
      throw mapped;
    }
    throw new LocationServiceError(
      'unavailable',
      'Lokasi tidak dapat dibaca saat ini. Pastikan GPS aktif lalu coba lagi.',
      true
    );
  }
}

/**
 * Berlangganan perubahan posisi untuk pelacakan live (marker peta, indikator
 * jarak). Mengembalikan fungsi pembatalan; aman dipanggil walau langganan gagal.
 */
export async function watchPosition(
  onUpdate: (position: DevicePosition) => void,
  onError?: (error: LocationServiceError) => void
): Promise<() => void> {
  try {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3_000,
        distanceInterval: 5,
      },
      (location) => onUpdate(mapPosition(location))
    );

    return () => subscription.remove();
  } catch (error) {
    onError?.(toLocationServiceError(error));
    return () => {};
  }
}

/** Jarak perangkat ke laboratorium, atau null bila radius lab belum diisi. */
export function getLaboratoryDistance(
  position: GeoCoordinates,
  laboratory: Laboratory
): number {
  return distanceToLaboratory(position, laboratory);
}
