import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
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
    <View style={[styles.sheet, { backgroundColor: theme.background }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    marginTop: -24,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    overflow: 'hidden',
  },
});
