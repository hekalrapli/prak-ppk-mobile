// src/hooks/use-session-attendance.ts
import { useEffect, useState, useCallback } from 'react';
import { AttendanceDoc } from '../types/attendance';
import { recordAttendance, subscribeSessionAttendance } from '../services/attendanceService';
import { useDemoData } from '../store/demo-data-context';

export function useSessionAttendance(practicumId: string, sessionId: string) {
  const [records, setRecords] = useState<AttendanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { state: demoState, dispatch } = useDemoData();

  useEffect(() => {
    if (!practicumId || !sessionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Jalankan listener Firestore
    const unsubscribe = subscribeSessionAttendance(
      practicumId,
      sessionId,
      (data) => {
        setRecords(data);
        setLoading(false);
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
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [practicumId, sessionId, demoState.attendanceRecords]);

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
      } catch (err: any) {
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

