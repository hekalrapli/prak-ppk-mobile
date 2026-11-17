import { useCallback, useEffect, useState } from 'react';

import {
  subscribeOwnAttendance,
  timestampToMillis,
} from '../services/attendanceService';
import { subscribeOwnLeaveRequest } from '../services/leaveService';
import type { AttendanceDoc, LeaveRequest } from '../types/attendance';

const EMPTY_RECORDS: AttendanceDoc[] = [];
const EMPTY_REQUESTS: LeaveRequest[] = [];

export interface HistorySessionRef {
  practicumId: string;
  sessionId: string;
}

interface HistoryState<T> {
  key: string;
  data: T[];
  error: string | null;
}

function sessionsKeyOf(sessions: HistorySessionRef[]) {
  return sessions
    .map((session) => `${session.practicumId}:${session.sessionId}`)
    .sort()
    .join('|');
}

/**
 * Riwayat kehadiran pribadi.
 *
 * Catatan penting: query collection-group `attendance` membutuhkan indeks
 * COLLECTION_GROUP_ASC yang tidak tersedia di semua project. Karena Firestore
 * Rules mengizinkan praktikan membaca dokumen presensinya sendiri, riwayat
 * dibaca lewat listener dokumen per sesi. Hasilnya identik, tetapi tidak
 * bergantung pada indeks console dan tetap real-time.
 */
export function useAttendanceHistory(
  praktikanId?: string,
  sessions: HistorySessionRef[] = []
) {
  const [state, setState] = useState<HistoryState<AttendanceDoc> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const sessionsKey = sessionsKeyOf(sessions);
  const requestKey = `${praktikanId ?? ''}|${attempt}|${sessionsKey}`;

  useEffect(() => {
    if (!praktikanId || sessions.length === 0) {
      return;
    }

    const key = requestKey;
    const records = new Map<string, AttendanceDoc>();
    let error: string | null = null;
    let emitted = false;

    const emit = () => {
      emitted = true;
      const data = Array.from(records.values()).sort(
        (a, b) => timestampToMillis(b.recordedAt) - timestampToMillis(a.recordedAt)
      );
      setState({ key, data, error });
    };

    const unsubscribes = sessions.map(({ practicumId, sessionId }) =>
      subscribeOwnAttendance(
        practicumId,
        sessionId,
        praktikanId,
        (record) => {
          const id = `${practicumId}:${sessionId}`;

          if (record) {
            records.set(id, record);
            emit();
            return;
          }

          const removed = records.delete(id);
          if (removed || !emitted) {
            emit();
          }
        },
        (err) => {
          error = err.message;
          emit();
        }
      )
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [praktikanId, attempt, requestKey, sessions]);

  const loaded =
    Boolean(praktikanId) && (sessions.length === 0 || state?.key === requestKey);

  return {
    records: loaded && state?.key === requestKey ? state.data : EMPTY_RECORDS,
    loading: Boolean(praktikanId) && !loaded,
    error: loaded && state?.key === requestKey ? state.error : null,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
  };
}

/**
 * Riwayat pengajuan izin pribadi, memakai listener dokumen per sesi dengan
 * alasan yang sama seperti riwayat kehadiran.
 */
export function useLeaveHistory(
  praktikanId?: string,
  sessions: HistorySessionRef[] = []
) {
  const [state, setState] = useState<HistoryState<LeaveRequest> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const sessionsKey = sessionsKeyOf(sessions);
  const requestKey = `${praktikanId ?? ''}|${attempt}|${sessionsKey}`;

  useEffect(() => {
    if (!praktikanId || sessions.length === 0) {
      return;
    }

    const key = requestKey;
    const requests = new Map<string, LeaveRequest>();
    let error: string | null = null;
    let emitted = false;

    const emit = () => {
      emitted = true;
      const data = Array.from(requests.values()).sort(
        (a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt)
      );
      setState({ key, data, error });
    };

    const unsubscribes = sessions.map(({ practicumId, sessionId }) =>
      subscribeOwnLeaveRequest(
        practicumId,
        sessionId,
        praktikanId,
        (request) => {
          const id = `${practicumId}:${sessionId}`;

          if (request) {
            requests.set(id, request);
            emit();
            return;
          }

          const removed = requests.delete(id);
          if (removed || !emitted) {
            emit();
          }
        },
        (err) => {
          error = err.message;
          emit();
        }
      )
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [praktikanId, attempt, requestKey, sessions]);

  const loaded =
    Boolean(praktikanId) && (sessions.length === 0 || state?.key === requestKey);

  return {
    requests: loaded && state?.key === requestKey ? state.data : EMPTY_REQUESTS,
    loading: Boolean(praktikanId) && !loaded,
    error: loaded && state?.key === requestKey ? state.error : null,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
  };
}
