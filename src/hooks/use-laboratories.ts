// src/hooks/use-laboratories.ts
import { useCallback, useEffect, useState } from 'react';

import { subscribeLaboratories } from '../services/laboratoryService';
import type { Laboratory } from '../types/location';

const EMPTY: Laboratory[] = [];

/** FR-P1-02/03: daftar laboratorium real-time dari koleksi `laboratorium`. */
export function useLaboratories() {
  const [laboratories, setLaboratories] = useState<Laboratory[]>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeLaboratories(
      (data) => {
        if (!active) return;
        setLaboratories(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (!active) return;
        // Daftar kosong lebih berguna daripada layar error total: peta tetap
        // tampil dan pengguna melihat pesan yang bisa ditindaklanjuti.
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((value) => value + 1);
  }, []);

  return {
    laboratories,
    loading,
    error,
    retry,
  };
}
