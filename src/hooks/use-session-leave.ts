// src/hooks/use-session-leave.ts
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  cancelLeaveRequest,
  classifyLeaveRequest,
  decideLeaveRequest,
  submitLeaveRequest,
  subscribeOwnLeaveRequest,
  subscribeSessionLeaveClassifications,
  subscribeSessionLeaveRequests,
  updateLeaveReason,
} from '../services/leaveService';
import type { LeaveClassification, LeaveRequest } from '../types/attendance';

interface UseSessionLeaveOptions {
  practicumId: string;
  sessionId: string;
  currentUserId?: string;
  isAsisten?: boolean;
  /** Hasil klasifikasi hanya dimuat bila layar membutuhkannya (asisten). */
  loadClassifications?: boolean;
}

interface LeaveState {
  key: string;
  requests: LeaveRequest[];
  error: string | null;
}

interface ClassificationState {
  key: string;
  data: Record<string, LeaveClassification>;
}

const EMPTY_REQUESTS: LeaveRequest[] = [];
const EMPTY_CLASSIFICATIONS: Record<string, LeaveClassification> = {};

export function useSessionLeave({
  practicumId,
  sessionId,
  currentUserId,
  isAsisten = false,
  loadClassifications = isAsisten,
}: UseSessionLeaveOptions) {
  const hasTarget = Boolean(practicumId && sessionId);
  const canLoadRequests = hasTarget && (isAsisten || Boolean(currentUserId));

  const [leaveState, setLeaveState] = useState<LeaveState | null>(null);
  const [classificationState, setClassificationState] =
    useState<ClassificationState | null>(null);
  const [attempt, setAttempt] = useState(0);

  const requestKey = `${practicumId}|${sessionId}|${isAsisten}|${currentUserId ?? ''}|${attempt}`;
  const classificationKey = `${practicumId}|${sessionId}|${attempt}`;

  useEffect(() => {
    if (!loadClassifications || !practicumId || !sessionId) {
      return;
    }

    const key = `${practicumId}|${sessionId}|${attempt}`;

    return subscribeSessionLeaveClassifications(
      practicumId,
      sessionId,
      (data) => setClassificationState({ key, data }),
      () => setClassificationState({ key, data: {} })
    );
  }, [loadClassifications, practicumId, sessionId, attempt]);

  useEffect(() => {
    if (!canLoadRequests || !practicumId || !sessionId) {
      return;
    }

    const key = `${practicumId}|${sessionId}|${isAsisten}|${currentUserId ?? ''}|${attempt}`;

    // Praktikan: listener dokumen sendiri (query koleksi ditolak Rules).
    if (!isAsisten) {
      if (!currentUserId) {
        return;
      }

      return subscribeOwnLeaveRequest(
        practicumId,
        sessionId,
        currentUserId,
        (request) => {
          setLeaveState({
            key,
            requests: request ? [request] : [],
            error: null,
          });
        },
        (err) => {
          setLeaveState({ key, requests: [], error: err.message });
        }
      );
    }

    // Asisten pengampu: seluruh pengajuan pada sesi ini.
    return subscribeSessionLeaveRequests(
      practicumId,
      sessionId,
      (data) => {
        setLeaveState({ key, requests: data, error: null });
      },
      (err) => {
        setLeaveState({ key, requests: [], error: err.message });
      }
    );
  }, [canLoadRequests, practicumId, sessionId, isAsisten, currentUserId, attempt]);

  const loadedLeave = leaveState?.key === requestKey ? leaveState : null;
  const leaveRequests = loadedLeave?.requests ?? EMPTY_REQUESTS;
  const classifications =
    classificationState?.key === classificationKey
      ? classificationState.data
      : EMPTY_CLASSIFICATIONS;

  // Gabungkan hasil klasifikasi (khusus asisten) ke daftar izin.
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
    return mergedLeaveRequests.find((request) => request.praktikanId === currentUserId);
  }, [mergedLeaveRequests, currentUserId]);

  const updateRequests = useCallback(
    (updater: (current: LeaveRequest[]) => LeaveRequest[]) => {
      setLeaveState((current) => {
        if (!current || current.key !== requestKey) {
          return current;
        }
        return { ...current, requests: updater(current.requests) };
      });
    },
    [requestKey]
  );

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

      updateRequests((current) => [
        ...current.filter((request) => request.praktikanId !== params.praktikanId),
        result,
      ]);

      return result;
    },
    [practicumId, sessionId, updateRequests]
  );

  const handleUpdateLeave = useCallback(
    async (praktikanId: string, newReason: string) => {
      const trimmed = newReason.trim();
      await updateLeaveReason(practicumId, sessionId, praktikanId, trimmed);

      updateRequests((current) =>
        current.map((request) =>
          request.praktikanId === praktikanId ? { ...request, reason: trimmed } : request
        )
      );
    },
    [practicumId, sessionId, updateRequests]
  );

  const handleCancelLeave = useCallback(
    async (praktikanId: string) => {
      await cancelLeaveRequest(practicumId, sessionId, praktikanId);
      updateRequests((current) =>
        current.filter((request) => request.praktikanId !== praktikanId)
      );
    },
    [practicumId, sessionId, updateRequests]
  );

  const handleClassifyLeave = useCallback(
    async (praktikanId: string, reason: string) => {
      await classifyLeaveRequest(practicumId, sessionId, praktikanId, reason);
    },
    [practicumId, sessionId]
  );

  const handleDecideLeave = useCallback(
    async (
      praktikanId: string,
      asistenId: string,
      decision: 'approved' | 'rejected',
      reviewNote?: string
    ) => {
      await decideLeaveRequest({
        practicumId,
        sessionId,
        praktikanId,
        asistenId,
        decision,
        reviewNote,
      });

      updateRequests((current) =>
        current.map((request) =>
          request.praktikanId === praktikanId
            ? {
                ...request,
                status: decision,
                reviewNote: reviewNote || '',
                decidedBy: asistenId,
              }
            : request
        )
      );
    },
    [practicumId, sessionId, updateRequests]
  );

  return {
    leaveRequests: mergedLeaveRequests,
    myLeaveRequest,
    loading: canLoadRequests && !loadedLeave,
    error: loadedLeave?.error ?? null,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
    handleSubmitLeave,
    handleUpdateLeave,
    handleCancelLeave,
    handleClassifyLeave,
    handleDecideLeave,
  };
}
