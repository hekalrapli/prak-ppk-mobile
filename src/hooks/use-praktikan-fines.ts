// src/hooks/use-praktikan-fines.ts
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  subscribeFineById,
  subscribePraktikanFines,
} from '@/services/paymentDataService';
import type { FineDoc } from '@/types/attendance';

interface FinesState {
  key: string;
  fines: FineDoc[];
  error: string | null;
}

interface SingleFineState {
  key: string;
  fine: FineDoc | null;
  error: string | null;
}

const EMPTY_FINES: FineDoc[] = [];

export function usePraktikanFines(praktikanId?: string) {
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<FinesState | null>(null);
  const key = `${praktikanId ?? ''}|${attempt}`;

  useEffect(() => {
    if (!praktikanId) {
      return;
    }

    return subscribePraktikanFines(
      praktikanId,
      (fines) => {
        setState({ key, fines, error: null });
        setRefreshing(false);
      },
      (message) => {
        setState({ key, fines: EMPTY_FINES, error: message });
        setRefreshing(false);
      }
    );
  }, [praktikanId, key]);

  const loaded = state?.key === key ? state : null;
  const fines = loaded?.fines ?? EMPTY_FINES;
  const loading = Boolean(praktikanId) && !loaded;
  const error = loaded?.error ?? null;

  const summary = useMemo(() => {
    let unpaidCount = 0;
    let pendingCount = 0;
    let failedCount = 0;
    let successCount = 0;
    let totalOutstandingAmount = 0;

    fines.forEach((fine) => {
      if (fine.status === 'unpaid') {
        unpaidCount += 1;
        totalOutstandingAmount += fine.amount;
      } else if (fine.status === 'pending') {
        pendingCount += 1;
        totalOutstandingAmount += fine.amount;
      } else if (fine.status === 'failed') {
        failedCount += 1;
        totalOutstandingAmount += fine.amount;
      } else {
        successCount += 1;
      }
    });

    return {
      unpaidCount,
      pendingCount,
      failedCount,
      successCount,
      actionableCount: unpaidCount + pendingCount + failedCount,
      totalOutstandingAmount,
    };
  }, [fines]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  const refresh = useCallback(() => {
    if (!praktikanId) return;
    setRefreshing(true);
    setAttempt((value) => value + 1);
  }, [praktikanId]);

  return {
    fines,
    summary,
    loading,
    refreshing,
    error,
    retry,
    refresh,
  };
}

export function useFineDetail(fineId?: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<SingleFineState | null>(null);
  const key = `${fineId ?? ''}|${attempt}`;

  useEffect(() => {
    if (!fineId) {
      return;
    }

    return subscribeFineById(
      fineId,
      (fine) => {
        setState({ key, fine, error: null });
      },
      (message) => {
        setState({ key, fine: null, error: message });
      }
    );
  }, [fineId, key]);

  const loaded = state?.key === key ? state : null;
  const fine = loaded?.fine ?? null;
  const loading = Boolean(fineId) && !loaded;
  const error = loaded?.error ?? null;

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return { fine, loading, error, retry };
}
