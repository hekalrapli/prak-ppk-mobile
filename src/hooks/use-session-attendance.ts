// src/hooks/use-session-attendance.ts
import { useCallback, useEffect, useState } from 'react';

import {
  recordAttendance,
  subscribeOwnAttendance,
  subscribeSessionAttendance,
} from '../services/attendanceService';
import type { AttendanceDoc, UserRole } from '../types/attendance';

interface UseSessionAttendanceOptions {
  role: UserRole;
  userId?: string;
}

interface AttendanceState {
  key: string;
  records: AttendanceDoc[];
  myRecord: AttendanceDoc | null;
  error: string | null;
}

const EMPTY_RECORDS: AttendanceDoc[] = [];

export function useSessionAttendance(
  practicumId: string,
  sessionId: string,
  { role, userId }: UseSessionAttendanceOptions
) {
  const hasTarget = Boolean(
    practicumId && sessionId && (role === 'asisten' || userId)
  );
  const [state, setState] = useState<AttendanceState | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${practicumId}|${sessionId}|${role}|${userId ?? ''}|${attempt}`;

  useEffect(() => {
    if (!practicumId || !sessionId) {
      return;
    }

    const key = `${practicumId}|${sessionId}|${role}|${userId ?? ''}|${attempt}`;

    if (role === 'praktikan') {
      if (!userId) {
        return;
      }

      // Security Rules hanya mengizinkan praktikan membaca dokumennya sendiri,
      // jadi listener diarahkan ke dokumen presensi miliknya.
      return subscribeOwnAttendance(
        practicumId,
        sessionId,
        userId,
        (record) => {
          setState({
            key,
            records: record ? [record] : [],
            myRecord: record,
            error: null,
          });
        },
        (err) => {
          setState({ key, records: [], myRecord: null, error: err.message });
        }
      );
    }

    // Asisten pengampu membaca seluruh presensi pada sesi ini.
    return subscribeSessionAttendance(
      practicumId,
      sessionId,
      (data) => {
        setState({ key, records: data, myRecord: null, error: null });
      },
      (err) => {
        setState({ key, records: [], myRecord: null, error: err.message });
      }
    );
  }, [practicumId, sessionId, role, userId, attempt]);

  const loaded = hasTarget && state?.key === requestKey ? state : null;

  const handleRecordAttendance = useCallback(
    async (params: {
      praktikanId: string;
      praktikanName: string;
      praktikanNim: string;
    }) => {
      // Tidak ada fallback lokal: kegagalan Firestore harus terlihat oleh
      // pengguna, bukan dilaporkan sebagai "berhasil".
      return recordAttendance({
        practicumId,
        sessionId,
        ...params,
      });
    },
    [practicumId, sessionId]
  );

  return {
    records: loaded?.records ?? EMPTY_RECORDS,
    myRecord: loaded?.myRecord ?? null,
    loading: hasTarget && !loaded,
    error: loaded?.error ?? null,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
    handleRecordAttendance,
  };
}
