import { useCallback, useEffect, useState } from 'react';

import { subscribePracticum, subscribeSession } from '../services/scheduleService';
import type { Practicum, Session } from '../types/attendance';

interface SessionDetailState {
  key: string;
  practicum: Practicum | null;
  session: Session | null;
  practicumLoaded: boolean;
  sessionLoaded: boolean;
  error: string | null;
}

/**
 * Memuat satu sesi beserta praktikum induknya secara real-time. Dipakai layar
 * detail sesi dan rekap agar status buka/tutup langsung terlihat tanpa reload.
 */
export function useSessionDetail(practicumId?: string, sessionId?: string) {
  const hasTarget = Boolean(practicumId && sessionId);
  const [state, setState] = useState<SessionDetailState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${practicumId ?? ''}|${sessionId ?? ''}|${attempt}`;

  useEffect(() => {
    if (!practicumId || !sessionId) {
      return;
    }

    const key = `${practicumId}|${sessionId}|${attempt}`;
    let active = true;

    const emptyState: SessionDetailState = {
      key,
      practicum: null,
      session: null,
      practicumLoaded: false,
      sessionLoaded: false,
      error: null,
    };

    const patch = (
      current: SessionDetailState | null,
      changes: Partial<SessionDetailState>
    ): SessionDetailState => ({ ...(current?.key === key ? current : emptyState), ...changes });

    const unsubscribePracticum = subscribePracticum(
      practicumId,
      (data) => {
        if (!active) return;
        setState((current) =>
          patch(current, { practicum: data, practicumLoaded: true })
        );
      },
      (message) => {
        if (!active) return;
        setState((current) =>
          patch(current, {
            practicum: null,
            practicumLoaded: true,
            session: null,
            sessionLoaded: true,
            error: message,
          })
        );
      }
    );

    const unsubscribeSession = subscribeSession(
      practicumId,
      sessionId,
      (data) => {
        if (!active) return;
        setState((current) => patch(current, { session: data, sessionLoaded: true }));
      },
      (message) => {
        if (!active) return;
        setState((current) =>
          patch(current, {
            practicum: null,
            practicumLoaded: true,
            session: null,
            sessionLoaded: true,
            error: message,
          })
        );
      }
    );

    return () => {
      active = false;
      unsubscribePracticum();
      unsubscribeSession();
    };
  }, [practicumId, sessionId, attempt]);

  const loaded = hasTarget && state?.key === requestKey ? state : null;

  return {
    practicum: loaded?.practicum ?? null,
    session: loaded?.session ?? null,
    loading: hasTarget && !loaded,
    error: loaded?.error ?? null,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
  };
}
