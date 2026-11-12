// src/hooks/use-session-leave.ts
import { useEffect, useState, useCallback, useMemo } from 'react';
import { LeaveRequest } from '../types/attendance';
import {
  cancelLeaveRequest,
  decideLeaveRequest,
  retryLeaveClassification,
  submitLeaveRequest,
  subscribeSessionLeaveRequests,
  updateLeaveReason,
} from '../services/leaveService';
import { useDemoData } from '../store/demo-data-context';

export function useSessionLeave(practicumId: string, sessionId: string, currentUserId?: string) {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
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

    const unsubscribe = subscribeSessionLeaveRequests(
      practicumId,
      sessionId,
      (data) => {
        setLeaveRequests(data);
        setLoading(false);
      },
      (err) => {
        // Fallback jika Firestore belum terkoneksi
        const local = (demoState.leaveRequests || []).filter(
          (lr) => lr.sessionId === sessionId
        );
        setLeaveRequests(local);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [practicumId, sessionId, demoState.leaveRequests]);

  const myLeaveRequest = useMemo(() => {
    if (!currentUserId) return undefined;
    return leaveRequests.find((lr) => lr.praktikanId === currentUserId);
  }, [leaveRequests, currentUserId]);

  const handleSubmitLeave = useCallback(
    async (params: {
      praktikanId: string;
      praktikanName: string;
      praktikanNim: string;
      reason: string;
    }) => {
      try {
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
      } catch (err: any) {
        throw err;
      }
    },
    [practicumId, sessionId, demoState, dispatch]
  );

  const handleUpdateLeave = useCallback(
    async (praktikanId: string, newReason: string) => {
      await updateLeaveReason(practicumId, sessionId, praktikanId, newReason);
    },
    [practicumId, sessionId]
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
    leaveRequests,
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

