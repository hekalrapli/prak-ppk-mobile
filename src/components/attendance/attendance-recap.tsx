import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useLaboratories } from '@/hooks/use-laboratories';
import { usePracticumParticipants } from '@/hooks/use-practicum-participants';
import { useSessionAttendance } from '@/hooks/use-session-attendance';
import { useSessionLeave } from '@/hooks/use-session-leave';
import { useTheme } from '@/hooks/use-theme';
import { buildRecapEntries } from '@/lib/recap';
import { findLaboratoryForSession } from '@/services/laboratoryService';
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
  const labs = useLaboratories();
  const participantsState = usePracticumParticipants(practicum.studentIds, true);

  const laboratory = useMemo(
    () => findLaboratoryForSession(labs.laboratories, session),
    [labs.laboratories, session]
  );

  const entries = useMemo(
    () =>
      buildRecapEntries(attendance.records, leave.leaveRequests, {
        participants: participantsState.participants,
        studentIds: practicum.studentIds,
        radiusMeter: laboratory?.radiusMeter,
      }),
    [
      attendance.records,
      leave.leaveRequests,
      participantsState.participants,
      practicum.studentIds,
      laboratory?.radiusMeter,
    ]
  );

  return (
    <View style={[styles.sheet, { backgroundColor: theme.background }]}>
      <SessionRecapList
        practicum={practicum}
        session={session}
        entries={entries}
        laboratory={laboratory}
        loading={
          attendance.loading ||
          leave.loading ||
          participantsState.loading ||
          labs.loading
        }
        error={
          attendance.error ??
          leave.error ??
          participantsState.error ??
          labs.error
        }
        onRetry={() => {
          attendance.retry();
          leave.retry();
          participantsState.retry();
          labs.retry();
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
