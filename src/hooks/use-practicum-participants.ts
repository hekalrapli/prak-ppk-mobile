import { useCallback, useEffect, useMemo, useState } from 'react';

import { getUsersByIds } from '../services/scheduleService';
import type { UserProfile } from '../types/auth';

interface ParticipantsState {
  key: string;
  users: UserProfile[];
  error: string | null;
}

const EMPTY_PARTICIPANTS: UserProfile[] = [];

/**
 * Memuat daftar profil peserta praktikum dari daftar `studentIds`.
 * Menggunakan pola request-key agar perubahan daftar peserta tersinkron tanpa
 * setState sinkron di dalam useEffect.
 */
export function usePracticumParticipants(studentIds?: string[], enabled = true) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ParticipantsState | null>(null);

  const studentIdsKey = useMemo(
    () => Array.from(new Set((studentIds ?? []).filter(Boolean))).sort().join('|'),
    [studentIds]
  );

  const hasStudentIds = enabled && studentIdsKey.length > 0;
  const requestKey = `${studentIdsKey}|${attempt}`;

  useEffect(() => {
    if (!enabled || !studentIdsKey) {
      return;
    }

    const ids = studentIdsKey.split('|');
    const key = `${studentIdsKey}|${attempt}`;
    let active = true;

    getUsersByIds(ids)
      .then((users) => {
        if (active) {
          setState({ key, users, error: null });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const message =
            err instanceof Error && err.message
              ? err.message
              : 'Gagal memuat daftar peserta praktikum.';
          setState({ key, users: EMPTY_PARTICIPANTS, error: message });
        }
      });

    return () => {
      active = false;
    };
  }, [enabled, studentIdsKey, attempt]);

  const loaded = hasStudentIds && state?.key === requestKey ? state : null;

  return {
    participants: loaded?.users ?? EMPTY_PARTICIPANTS,
    loading: hasStudentIds && !loaded,
    error: loaded?.error ?? null,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
  };
}
