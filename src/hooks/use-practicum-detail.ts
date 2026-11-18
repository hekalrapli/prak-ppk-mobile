import { useCallback, useEffect, useMemo, useState } from 'react';

import { compareSessions } from '../lib/session-date';
import {
  getUsersByIds,
  subscribePracticum,
  subscribePracticumSessions,
} from '../services/scheduleService';
import type { Practicum, Session } from '../types/attendance';
import type { UserProfile } from '../types/auth';

interface PracticumDetailState {
  key: string;
  practicum: Practicum | null;
  sessions: Session[];
  practicumLoaded: boolean;
  sessionsLoaded: boolean;
  error: string | null;
}

interface ParticipantState {
  key: string;
  users: UserProfile[];
}

const EMPTY_SESSIONS: Session[] = [];
const EMPTY_PARTICIPANTS: UserProfile[] = [];

export function usePracticumDetail(practicumId?: string) {
  const hasTarget = Boolean(practicumId);
  const [state, setState] = useState<PracticumDetailState | null>(null);
  const [participantState, setParticipantState] =
    useState<ParticipantState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${practicumId ?? ''}|${attempt}`;

  useEffect(() => {
    if (!practicumId) {
      return;
    }

    const key = `${practicumId}|${attempt}`;
    let active = true;

    const emptyState: PracticumDetailState = {
      key,
      practicum: null,
      sessions: EMPTY_SESSIONS,
      practicumLoaded: false,
      sessionsLoaded: false,
      error: null,
    };

    const patch = (
      current: PracticumDetailState | null,
      changes: Partial<PracticumDetailState>
    ): PracticumDetailState => ({
      ...(current?.key === key ? current : emptyState),
      ...changes,
    });

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
            sessions: EMPTY_SESSIONS,
            sessionsLoaded: true,
            error: message,
          })
        );
      }
    );

    const unsubscribeSessions = subscribePracticumSessions(
      practicumId,
      (list) => {
        if (!active) return;
        setState((current) =>
          patch(current, {
            sessions: [...list].sort(compareSessions),
            sessionsLoaded: true,
          })
        );
      },
      (message) => {
        if (!active) return;
        setState((current) =>
          patch(current, {
            sessions: EMPTY_SESSIONS,
            sessionsLoaded: true,
            error: message,
          })
        );
      }
    );

    return () => {
      active = false;
      unsubscribePracticum();
      unsubscribeSessions();
    };
  }, [practicumId, attempt]);

  const loaded = hasTarget && state?.key === requestKey ? state : null;
  const practicum = loaded?.practicum ?? null;
  const studentIdsKey = useMemo(
    () => (practicum?.studentIds ?? []).slice().sort().join('|'),
    [practicum?.studentIds]
  );
  const participantsKey = `${studentIdsKey}|${attempt}`;

  useEffect(() => {
    const ids = studentIdsKey ? studentIdsKey.split('|') : [];
    if (ids.length === 0) {
      return;
    }

    const key = `${studentIdsKey}|${attempt}`;
    let active = true;

    getUsersByIds(ids)
      .then((users) => {
        if (active) {
          setParticipantState({ key, users });
        }
      })
      .catch(() => {
        if (active) {
          setParticipantState({ key, users: EMPTY_PARTICIPANTS });
        }
      });

    return () => {
      active = false;
    };
  }, [studentIdsKey, attempt]);

  const hasStudentIds = studentIdsKey.length > 0;
  const loadedParticipants =
    hasStudentIds && participantState?.key === participantsKey
      ? participantState
      : null;

  const isLoading =
    hasTarget && (!loaded || !loaded.practicumLoaded || !loaded.sessionsLoaded);

  return {
    practicum,
    sessions: loaded?.sessions ?? EMPTY_SESSIONS,
    participants: loadedParticipants?.users ?? EMPTY_PARTICIPANTS,
    participantsLoading: hasStudentIds && !loadedParticipants,
    loading: isLoading,
    error: loaded?.error ?? null,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
  };
}
