// src/hooks/use-session-leave.ts
import { useEffect, useState, useCallback, useMemo } from 'react';
import { LeaveClassification, LeaveRequest } from '../types/attendance';
import {
  cancelLeaveRequest,
  decideLeaveRequest,
  retryLeaveClassification,
  submitLeaveRequest,
  subscribeOwnLeaveRequest,
  subscribeSessionLeaveClassifications,
  subscribeSessionLeaveRequests,
  updateLeaveReason,
} from '../services/leaveService';
import { useDemoData } from '../store/demo-data-context';

export function useSessionLeave(
  practicumId: string,
  sessionId: string,
  currentUserId?: string,
  isAsisten = false
) {
  const hasTarget = Boolean(practicumId && sessionId);
  const targetKey = `${practicumId}|${sessionId}`;
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [classifications, setClassifications] = useState<Record<string, LeaveClassification>>({});
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<{ key: string; message: string } | null>(null);
  const { state: demoState, dispatch } = useDemoData();

  const loading = hasTarget && loadedKey !== targetKey;
  const error = errorState?.key === targetKey ? errorState.message : null;

  // Hasil klasifikasi AI hanya dimuat untuk asisten (praktikan tidak berhak baca).
  useEffect(() => {
    if (!isAsisten || !practicumId || !sessionId) {
      return;
    }

    const unsubscribe = subscribeSessionLeaveClassifications(
      practicumId,
      sessionId,
      (data) => setClassifications(data),
      () => setClassifications({})
    );

    return () => {
      unsubscribe();
    };
  }, [isAsisten, practicumId, sessionId]);

  useEffect(() => {
    if (!practicumId || !sessionId) {
      return;
    }

    const key = `${practicumId}|${sessionId}`;

    // Praktikan: listener dokumen sendiri (query koleksi ditolak Rules).
    if (!isAsisten && currentUserId) {
      const unsubscribe = subscribeOwnLeaveRequest(
        practicumId,
        sessionId,
        currentUserId,
        (request) => {
          setLeaveRequests(request ? [request] : []);
          setLoadedKey(key);
        },
        (err) => {
          const local = (demoState.leaveRequests || []).filter(
            (lr) => lr.sessionId === sessionId && lr.praktikanId === currentUserId
          );
          setLeaveRequests(local);
          setErrorState({ key, message: err.message });
          setLoadedKey(key);
        }
      );

      return () => {
        unsubscribe();
      };
    }

    // Asisten: seluruh pengajuan pada sesi ini.
    const unsubscribe = subscribeSessionLeaveRequests(
      practicumId,
      sessionId,
      (data) => {
        setLeaveRequests(data);
        setLoadedKey(key);
      },
      (err) => {
        // Fallback jika Firestore belum terkoneksi
        const local = (demoState.leaveRequests || []).filter(
          (lr) => lr.sessionId === sessionId
        );
        setLeaveRequests(local);
        setErrorState({ key, message: err.message });
        setLoadedKey(key);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [practicumId, sessionId, isAsisten, currentUserId, demoState.leaveRequests]);

  // Gabungkan hasil klasifikasi (khusus asisten) ke daftar izin.
  // Untuk praktikan, `ai` selalu undefined sehingga hasil AI tidak tampil.
  const mergedLeaveRequests = useMemo(
    () =>
      leaveRequests.map((request) => ({
        ...request,
        ai: isAsisten ? classifications[request.praktikanId] : undefined,
      })),
    [leaveRequests, classifications, isAsisten]
  );

  const myLeaveRequest = useMemo(() => {
    if (!currentUserId) return undefined;
    return mergedLeaveRequests.find((lr) => lr.praktikanId === currentUserId);
  }, [mergedLeaveRequests, currentUserId]);

  const handleSubmitLeave = useCallback(
    async (params: {
      praktikanId: string;
      praktikanName: string;
      praktikanNim: string;
      reason: string;
    }) => {
      const result = await submitLeaveRequest({
        practicumId,
        sessionId,
        ...params,
      });

      // Update local state juga jika diperlukan
      setLeaveRequests((prev) => {
        const filtered = prev.filter((r) => r.praktikanId !== params.praktikanId);
        return [...filtered, result];
      });

      if ('leaveRequests' in demoState) {
        dispatch({
          type: 'ADD_LEAVE_REQUEST' as any,
          payload: result,
        });
      }

      return result;
    },
    [practicumId, sessionId, demoState, dispatch]
  );

  const handleUpdateLeave = useCallback(
    async (praktikanId: string, newReason: string) => {
      const trimmed = newReason.trim();
      await updateLeaveReason(practicumId, sessionId, praktikanId, trimmed);

      // Perbarui state lokal segera agar kartu izin langsung menampilkan
      // alasan baru, tanpa menunggu listener Firestore.
      setLeaveRequests((prev) =>
        prev.map((request) =>
          request.praktikanId === praktikanId ? { ...request, reason: trimmed } : request
        )
      );

      dispatch({
        type: 'UPDATE_LEAVE_REQUEST' as any,
        payload: { sessionId, praktikanId, reason: trimmed },
      });
    },
    [practicumId, sessionId, dispatch]
  );

  const handleCancelLeave = useCallback(
    async (praktikanId: string) => {
      await cancelLeaveRequest(practicumId, sessionId, praktikanId);
      setLeaveRequests((prev) => prev.filter((r) => r.praktikanId !== praktikanId));
    },
    [practicumId, sessionId]
  );

  const handleRetryClassification = useCallback(
    async (praktikanId: string, reason: string) => {
      await retryLeaveClassification(practicumId, sessionId, praktikanId, reason);
    },
    [practicumId, sessionId]
  );

  const handleDecideLeave = useCallback(
    async (praktikanId: string, asistenId: string, decision: 'approved' | 'rejected', reviewNote?: string) => {
      await decideLeaveRequest({
        practicumId,
        sessionId,
        praktikanId,
        asistenId,
        decision,
        reviewNote,
      });
      setLeaveRequests((prev) =>
        prev.map((r) =>
          r.praktikanId === praktikanId
            ? { ...r, status: decision, reviewNote: reviewNote || '', decidedBy: asistenId }
            : r
        )
      );
    },
    [practicumId, sessionId]
  );

  return {
    leaveRequests: mergedLeaveRequests,
    myLeaveRequest,
    loading,
    error,
    handleSubmitLeave,
    handleUpdateLeave,
    handleCancelLeave,
    handleRetryClassification,
    handleDecideLeave,
  };
}

