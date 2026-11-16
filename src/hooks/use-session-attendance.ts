// src/hooks/use-session-attendance.ts
import { useEffect, useState, useCallback } from 'react';
import { AttendanceDoc } from '../types/attendance';
import { recordAttendance, subscribeSessionAttendance } from '../services/attendanceService';
import { useDemoData } from '../store/demo-data-context';

export function useSessionAttendance(practicumId: string, sessionId: string) {
  const hasTarget = Boolean(practicumId && sessionId);
  const targetKey = `${practicumId}|${sessionId}`;
  const [records, setRecords] = useState<AttendanceDoc[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
  const { state: demoState, dispatch } = useDemoData();

  const loading = hasTarget && loadedKey !== targetKey;
  const error = errorState?.key === targetKey ? errorState.message : null;

  useEffect(() => {
    if (!practicumId || !sessionId) {
      return;
    }

    const key = `${practicumId}|${sessionId}`;

    // Jalankan listener Firestore
    const unsubscribe = subscribeSessionAttendance(
      practicumId,
      sessionId,
      (data) => {
        setRecords(data);
        setLoadedKey(key);
      },
      (err) => {
        // Jika Firestore belum dikonfigurasi / offline, fallback ke in-memory demo records
        const fallback = demoState.attendanceRecords
          .filter((r) => r.sessionId === sessionId)
          .map((r) => {
            const user = demoState.users.find((u) => u.id === r.praktikanId);
            return {
              id: r.id,
              praktikanId: r.praktikanId,
              praktikanName: user?.name || r.praktikanName || 'Praktikan',
              praktikanNim: user?.identifier || r.praktikanNim || '',
              status: r.status,
              recordedAt: r.recordedAt,
              sessionId,
              practicumId,
            } as AttendanceDoc;
          });
        setRecords(fallback);
        setErrorState({ key, message: err.message });
        setLoadedKey(key);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [practicumId, sessionId, demoState.attendanceRecords, demoState.users]);

  const handleRecordAttendance = useCallback(
    async (params: {
      praktikanId: string;
      praktikanName: string;
      praktikanNim: string;
    }) => {
      try {
        const result = await recordAttendance({
          practicumId,
          sessionId,
          ...params,
        });

        // Selaraskan juga ke demo context agar tetap sinkron jika user ganti peran di demo
        dispatch({
          type: 'RECORD_ATTENDANCE',
          payload: {
            sessionId,
            praktikanId: params.praktikanId,
            at: result.recordedAtDisplay,
          },
        });

        return result;
      } catch {
        // Jika gagal di Firestore (misal mode offline / belum ada config), fallback simpan di local demo context
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const fallbackTime = `${hours}:${minutes}`;

        dispatch({
          type: 'RECORD_ATTENDANCE',
          payload: {
            sessionId,
            praktikanId: params.praktikanId,
            at: fallbackTime,
          },
        });

        return { success: true, recordedAtDisplay: fallbackTime };
      }
    },
    [practicumId, sessionId, dispatch]
  );

  return {
    records,
    loading,
    error,
    handleRecordAttendance,
  };
}

