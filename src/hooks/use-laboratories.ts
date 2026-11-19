import { useCallback, useEffect, useMemo, useState } from 'react';

import { subscribeLaboratories, subscribeLaboratory } from '../services/labService';
import type { Laboratory } from '../types/attendance';
import type { Laboratory as LocationLaboratory } from '../types/location';

interface LaboratoriesState {
  attempt: number;
  labs: Laboratory[];
  error: string | null;
}

interface LaboratoryDetailState {
  key: string;
  lab: Laboratory | null;
  error: string | null;
}

const EMPTY_LABS: Laboratory[] = [];

function toLocationLaboratory(lab: Laboratory): LocationLaboratory | null {
  const validCoordinate =
    Number.isFinite(lab.latitude) &&
    Number.isFinite(lab.longitude) &&
    lab.latitude >= -90 &&
    lab.latitude <= 90 &&
    lab.longitude >= -180 &&
    lab.longitude <= 180;

  if (!validCoordinate) {
    return null;
  }

  return {
    id: lab.id,
    name: lab.nama.trim() || 'Laboratorium',
    building: lab.gedung.trim(),
    latitude: lab.latitude,
    longitude: lab.longitude,
    radiusMeter:
      Number.isFinite(lab.radius_meter) && lab.radius_meter > 0
        ? lab.radius_meter
        : 0,
  };
}

/**
 * Listener real-time daftar lokasi lab & geofence pada koleksi `laboratorium`.
 * Mengembalikan `labs` (format kontrak Firestore untuk CRUD asisten) serta
 * `laboratories` (format `types/location` untuk peta & presensi FR-P1-02/03).
 */
export function useLaboratories(enabled = true) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LaboratoriesState | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    const unsubscribe = subscribeLaboratories(
      (labs) => {
        if (!active) return;
        setState({ attempt, labs, error: null });
        setRefreshing(false);
      },
      (message) => {
        if (!active) return;
        setState({ attempt, labs: EMPTY_LABS, error: message });
        setRefreshing(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [attempt, enabled]);

  const loaded = enabled && state?.attempt === attempt ? state : null;
  const labs = loaded?.labs ?? EMPTY_LABS;

  const laboratories = useMemo(
    () =>
      labs
        .map(toLocationLaboratory)
        .filter((item): item is LocationLaboratory => item !== null),
    [labs]
  );

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setAttempt((value) => value + 1);
  }, []);

  return {
    labs,
    laboratories,
    loading: enabled && !loaded,
    refreshing,
    error: loaded?.error ?? null,
    retry,
    refresh,
  };
}

export function useLaboratory(labId?: string) {
  const hasTarget = Boolean(labId);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LaboratoryDetailState | null>(null);
  const requestKey = `${labId ?? ''}|${attempt}`;

  useEffect(() => {
    if (!labId) {
      return;
    }

    const key = `${labId}|${attempt}`;
    let active = true;

    const unsubscribe = subscribeLaboratory(
      labId,
      (lab) => {
        if (!active) return;
        setState({ key, lab, error: null });
      },
      (message) => {
        if (!active) return;
        setState({ key, lab: null, error: message });
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [labId, attempt]);

  const loaded = hasTarget && state?.key === requestKey ? state : null;

  return {
    lab: loaded?.lab ?? null,
    loading: hasTarget && !loaded,
    error: loaded?.error ?? null,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
  };
}
