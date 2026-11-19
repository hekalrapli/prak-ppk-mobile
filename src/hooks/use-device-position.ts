// src/hooks/use-device-position.ts
import { useCallback, useEffect, useState } from 'react';

import {
  getCurrentCoordinates,
  getLocationPermissionState,
  LocationServiceError,
  openDeviceSettings,
  requestLocationPermission,
  watchPosition,
} from '../services/locationService';
import type {
  DevicePosition,
  LocationIssue,
  LocationPermissionState,
} from '../types/location';

interface UseDevicePositionOptions {
  /** Ikuti perubahan posisi setelah pembacaan pertama (default true). */
  watch?: boolean;
}

function issueFromError(error: unknown): LocationIssue {
  return error instanceof LocationServiceError ? error.issue : 'unavailable';
}

/**
 * FR-P1-01/02: status izin + posisi perangkat untuk layar presence dan peta.
 *
 * Izinkan hanya dibaca otomatis bila pengguna sudah pernah memberi izin;
 * dialog sistem hanya muncul lewat `requestPermission()` agar layar dapat
 * menampilkan penjelasan lebih dulu.
 */
export function useDevicePosition(options: UseDevicePositionOptions = {}) {
  const watchEnabled = options.watch ?? true;

  const [permission, setPermission] = useState<LocationPermissionState | 'checking'>(
    'checking'
  );
  const [position, setPosition] = useState<DevicePosition | null>(null);
  const [issue, setIssue] = useState<LocationIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let stopWatching: (() => void) | undefined;

    const run = async () => {
      let currentPermission: LocationPermissionState;
      try {
        currentPermission = await getLocationPermissionState();
      } catch (error) {
        if (cancelled) return;
        setIssue(issueFromError(error));
        setLoading(false);
        return;
      }

      if (cancelled) return;
      setPermission(currentPermission);

      if (currentPermission !== 'granted') {
        setPosition(null);
        setLoading(false);
        setIssue(currentPermission === 'denied' ? 'permission-denied' : null);
        return;
      }

      try {
        const current = await getCurrentCoordinates();
        if (cancelled) return;

        setPosition(current);
        setIssue(current.mocked ? 'mocked' : null);
        setLoading(false);

        if (!watchEnabled) return;

        stopWatching = await watchPosition(
          (next) => {
            if (cancelled) return;
            setPosition(next);
            setIssue(next.mocked ? 'mocked' : null);
            setLoading(false);
          },
          (error) => {
            if (cancelled) return;
            setIssue(error.issue);
            setLoading(false);
          }
        );

        // Langganan bisa selesai dibuat setelah layar ditutup; lepaskan agar
        // GPS tidak terus berjalan di latar belakang.
        if (cancelled) {
          stopWatching();
          stopWatching = undefined;
        }
      } catch (error) {
        if (cancelled) return;
        setIssue(issueFromError(error));
        setPosition(null);
        setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      stopWatching?.();
    };
  }, [attempt, watchEnabled]);

  /** Memunculkan dialog izin sistem, lalu membaca posisi bila diizinkan. */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        setPermission('denied');
        setIssue('permission-denied');
        setLoading(false);
        return false;
      }
      setLoading(true);
      setIssue(null);
      setAttempt((value) => value + 1);
      return true;
    } catch (error) {
      setIssue(issueFromError(error));
      setLoading(false);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setIssue(null);
    setAttempt((value) => value + 1);
  }, []);

  return {
    permission,
    position,
    issue,
    loading,
    busy,
    requestPermission,
    refresh,
    openSettings: openDeviceSettings,
  };
}
