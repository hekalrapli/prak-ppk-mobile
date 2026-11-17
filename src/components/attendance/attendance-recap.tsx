// src/components/attendance/attendance-recap.tsx
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSessionAttendance } from '@/hooks/use-session-attendance';
import { useSessionLeave } from '@/hooks/use-session-leave';
import { useTheme } from '@/hooks/use-theme';
import { buildRecapEntries } from '@/lib/recap';
import type { Practicum, Session } from '@/types/attendance';
import { SessionRecapList } from './session-recap-list';

interface AttendanceRecapProps {
  practicum: Practicum;
  session: Session;
}

export function AttendanceRecap({ practicum, session }: AttendanceRecapProps) {
  const theme = useTheme();

  const attendance = useSessionAttendance(practicum.id, session.id, { role: 'asisten' });
  const leave = useSessionLeave({
    practicumId: practicum.id,
    sessionId: session.id,
    isAsisten: true,
    loadClassifications: false,
  });

  const entries = useMemo(
    () => buildRecapEntries(attendance.records, leave.leaveRequests),
    [attendance.records, leave.leaveRequests]
  );

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <SessionRecapList
        practicum={practicum}
        session={session}
        entries={entries}
        loading={attendance.loading || leave.loading}
        error={attendance.error ?? leave.error}
        onRetry={() => {
          attendance.retry();
          leave.retry();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
