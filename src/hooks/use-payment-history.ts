// src/hooks/use-payment-history.ts
import { useCallback, useEffect, useMemo, useState } from 'react';

import { subscribePraktikanPaymentTransactions } from '@/services/paymentDataService';
import type { PaymentTransactionDoc } from '@/types/attendance';

interface PaymentHistoryState {
  key: string;
  transactions: PaymentTransactionDoc[];
  error: string | null;
}

const EMPTY_TRANSACTIONS: PaymentTransactionDoc[] = [];

export function usePaymentHistory(praktikanId?: string) {
  const [attempt, setAttempt] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<PaymentHistoryState | null>(null);
  const key = `${praktikanId ?? ''}|${attempt}`;

  useEffect(() => {
    if (!praktikanId) {
      return;
    }

    return subscribePraktikanPaymentTransactions(
      praktikanId,
      (transactions) => {
        setState({ key, transactions, error: null });
        setRefreshing(false);
      },
      (message) => {
        setState({ key, transactions: EMPTY_TRANSACTIONS, error: message });
        setRefreshing(false);
      }
    );
  }, [praktikanId, key]);

  const loaded = state?.key === key ? state : null;
  const transactions = loaded?.transactions ?? EMPTY_TRANSACTIONS;
  const loading = Boolean(praktikanId) && !loaded;
  const error = loaded?.error ?? null;

  const counts = useMemo(() => {
    let pending = 0;
    let success = 0;
    let failed = 0;

    transactions.forEach((tx) => {
      if (tx.status === 'success') success += 1;
      else if (tx.status === 'failed') failed += 1;
      else pending += 1;
    });

    return {
      all: transactions.length,
      pending,
      success,
      failed,
    };
  }, [transactions]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  const refresh = useCallback(() => {
    if (!praktikanId) return;
    setRefreshing(true);
    setAttempt((value) => value + 1);
  }, [praktikanId]);

  return {
    transactions,
    counts,
    loading,
    refreshing,
    error,
    retry,
    refresh,
  };
}
