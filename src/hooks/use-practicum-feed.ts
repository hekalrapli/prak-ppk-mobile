import { useCallback, useEffect, useMemo, useState } from 'react';

import { compareSessions } from '../lib/session-date';
import {
  subscribeAsistenPracticums,
  subscribePraktikanPracticums,
  subscribePracticumSessions,
} from '../services/scheduleService';
import type { Practicum, Session, UserRole } from '../types/attendance';

interface PracticumState {
  key: string;
  practicums: Practicum[];
  error: string | null;
}

interface SessionState {
  key: string;
  byPracticum: Record<string, Session[]>;
  error: string | null;
}

const EMPTY_SESSIONS: Record<string, Session[]> = {};

/**
 * Sumber jadwal tunggal untuk kedua peran:
 * - asisten: hanya praktikum dengan `assistantId == uid`
 * - praktikan: hanya praktikum yang memuat uid di `studentIds`
 *
 * `refresh` mempertahankan data yang sudah tampil (tidak diganti skeleton)
 * dan hanya memicu ulang listener Firestore.
 */
export function usePracticumFeed(role: UserRole, userId?: string) {
  const [practicumAttempt, setPracticumAttempt] = useState(0);
  const [practicumState, setPracticumState] = useState<PracticumState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const practicumKey = `${role}|${userId ?? ''}`;

  useEffect(() => {
    if (!userId) {
      return;
    }

    const handleData = (data: Practicum[]) => {
      setPracticumState({ key: practicumKey, practicums: data, error: null });
      setRefreshing(false);
    };
    const handleError = (message: string) => {
      setPracticumState({ key: practicumKey, practicums: [], error: message });
      setRefreshing(false);
    };

    return role === 'asisten'
      ? subscribeAsistenPracticums(userId, handleData, handleError)
      : subscribePraktikanPracticums(userId, handleData, handleError);
  }, [role, userId, practicumAttempt, practicumKey]);

  const loadedPracticums = practicumState?.key === practicumKey ? practicumState : null;
  const practicums = useMemo(
    () => loadedPracticums?.practicums ?? [],
    [loadedPracticums]
  );
  const practicumsLoading = Boolean(userId) && !loadedPracticums;
  const practicumsError = loadedPracticums?.error ?? null;

  const practicumIdsKey = useMemo(
    () =>
      practicums
        .map((practicum) => practicum.id)
        .sort()
        .join('|'),
    [practicums]
  );

  const [sessionsAttempt, setSessionsAttempt] = useState(0);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);

  useEffect(() => {
    const ids = practicumIdsKey ? practicumIdsKey.split('|') : [];

    if (ids.length === 0) {
      return;
    }

    const pendingFirstEmit = new Set(ids);
    const collected: Record<string, Session[]> = {};

    const unsubscribes = ids.map((practicumId) =>
      subscribePracticumSessions(
        practicumId,
        (sessionList) => {
          collected[practicumId] = sessionList;
          pendingFirstEmit.delete(practicumId);

          if (pendingFirstEmit.size === 0) {
            setSessionState({
              key: practicumIdsKey,
              byPracticum: { ...collected },
              error: null,
            });
            setRefreshing(false);
          }
        },
        (message) => {
          setSessionState({
            key: practicumIdsKey,
            byPracticum: { ...collected },
            error: message,
          });
          setRefreshing(false);
        }
      )
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [practicumIdsKey, sessionsAttempt]);

  const loadedSessions = sessionState?.key === practicumIdsKey ? sessionState : null;
  const sessionsByPracticum = loadedSessions?.byPracticum ?? EMPTY_SESSIONS;
  const sessionsLoading = practicumIdsKey.length > 0 && !loadedSessions;
  const sessionsError = loadedSessions?.error ?? null;

  const sessions = useMemo(() => {
    const list: Session[] = [];
    Object.values(sessionsByPracticum).forEach((items) => list.push(...items));
    return list.sort(compareSessions);
  }, [sessionsByPracticum]);

  const retry = useCallback(() => {
    setPracticumAttempt((value) => value + 1);
    setSessionsAttempt((value) => value + 1);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setPracticumAttempt((value) => value + 1);
    setSessionsAttempt((value) => value + 1);
  }, []);

  return {
    practicums,
    sessions,
    loading: practicumsLoading || sessionsLoading,
    refreshing,
    error: practicumsError ?? sessionsError,
    retry,
    refresh,
  };
}
