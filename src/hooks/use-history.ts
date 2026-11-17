import { useCallback, useEffect, useState } from 'react';

import {
  subscribeUserAttendanceHistory,
  timestampToMillis,
} from '../services/attendanceService';
import { subscribeOwnLeaveHistory } from '../services/leaveService';
import type { AttendanceDoc, LeaveRequest } from '../types/attendance';

const EMPTY_RECORDS: AttendanceDoc[] = [];
const EMPTY_REQUESTS: LeaveRequest[] = [];

interface HistoryState<T> {
  key: string;
  data: T[];
  error: string | null;
}

export function useAttendanceHistory(praktikanId?: string) {
  const [state, setState] = useState<HistoryState<AttendanceDoc> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${praktikanId ?? ''}|${attempt}`;

  useEffect(() => {
    if (!praktikanId) {
      return;
    }

    const key = `${praktikanId}|${attempt}`;

    return subscribeUserAttendanceHistory(
      praktikanId,
      (data) => {
        setState({
          key,
          data: [...data].sort(
            (a, b) => timestampToMillis(b.recordedAt) - timestampToMillis(a.recordedAt)
          ),
          error: null,
        });
      },
      (err) => {
        setState({ key, data: [], error: err.message });
      }
    );
  }, [praktikanId, attempt]);

  const loaded = Boolean(praktikanId) && state?.key === requestKey;

  return {
    records: loaded && state ? state.data : EMPTY_RECORDS,
    loading: Boolean(praktikanId) && !loaded,
    error: loaded && state ? state.error : null,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
  };
}

export function useLeaveHistory(praktikanId?: string) {
  const [state, setState] = useState<HistoryState<LeaveRequest> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${praktikanId ?? ''}|${attempt}`;

  useEffect(() => {
    if (!praktikanId) {
      return;
    }

    const key = `${praktikanId}|${attempt}`;

    return subscribeOwnLeaveHistory(
      praktikanId,
      (data) => {
        setState({
          key,
          data: [...data].sort(
            (a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt)
          ),
          error: null,
        });
      },
      (err) => {
        setState({ key, data: [], error: err.message });
      }
    );
  }, [praktikanId, attempt]);

  const loaded = Boolean(praktikanId) && state?.key === requestKey;

  return {
    requests: loaded && state ? state.data : EMPTY_REQUESTS,
    loading: Boolean(praktikanId) && !loaded,
    error: loaded && state ? state.error : null,
    retry: useCallback(() => setAttempt((value) => value + 1), []),
  };
}
