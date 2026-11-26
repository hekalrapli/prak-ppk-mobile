// src/hooks/use-aslab-dashboard.ts
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  aggregateAslabDashboardData,
  type AslabDashboardData,
  type DashboardPeriod,
} from '../services/dashboardService';
import { subscribeAllFines } from '../services/fineService';
import { subscribeLaboratories } from '../services/laboratoryService';
import {
  subscribeAllPracticums,
  subscribeAllSessions,
} from '../services/scheduleService';
import type { FineDoc, Practicum, Session } from '../types/attendance';
import type { Laboratory } from '../types/location';

export function useAslabDashboard(initialPeriod: DashboardPeriod = 'day') {
  const [period, setPeriod] = useState<DashboardPeriod>(initialPeriod);
  const [attempt, setAttempt] = useState(0);

  const [labs, setLabs] = useState<Laboratory[]>([]);
  const [practicums, setPracticums] = useState<Practicum[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [fines, setFines] = useState<FineDoc[]>([]);

  const [labsLoaded, setLabsLoaded] = useState(false);
  const [practicumsLoaded, setPracticumsLoaded] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [finesLoaded, setFinesLoaded] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubLabs = subscribeLaboratories(
      (data) => {
        setLabs(data);
        setLabsLoaded(true);
        setRefreshing(false);
      },
      (err) => {
        setError(err.message);
        setLabsLoaded(true);
        setRefreshing(false);
      }
    );

    const unsubPracticums = subscribeAllPracticums(
      (data) => {
        setPracticums(data);
        setPracticumsLoaded(true);
        setRefreshing(false);
      },
      (errMsg) => {
        setError(errMsg);
        setPracticumsLoaded(true);
        setRefreshing(false);
      }
    );

    const unsubSessions = subscribeAllSessions(
      (data) => {
        setSessions(data);
        setSessionsLoaded(true);
        setRefreshing(false);
      },
      (errMsg) => {
        setError(errMsg);
        setSessionsLoaded(true);
        setRefreshing(false);
      }
    );

    const unsubFines = subscribeAllFines(
      (data) => {
        setFines(data);
        setFinesLoaded(true);
        setRefreshing(false);
      },
      (err) => {
        setError(err.message);
        setFinesLoaded(true);
        setRefreshing(false);
      }
    );

    return () => {
      unsubLabs();
      unsubPracticums();
      unsubSessions();
      unsubFines();
    };
  }, [attempt]);

  const loading =
    !labsLoaded || !practicumsLoaded || !sessionsLoaded || !finesLoaded;

  const refresh = useCallback(() => {
    setError(null);
    setRefreshing(true);
    setAttempt((val) => val + 1);
  }, []);

  const dashboardData: AslabDashboardData = useMemo(() => {
    return aggregateAslabDashboardData({
      period,
      labs,
      practicums,
      sessions,
      fines,
    });
  }, [period, labs, practicums, sessions, fines]);

  return {
    period,
    setPeriod,
    dashboardData,
    loading,
    refreshing,
    error,
    refresh,
  };
}
