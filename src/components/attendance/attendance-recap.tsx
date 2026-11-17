// src/components/attendance/attendance-recap.tsx
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { StatusDot } from '@/components/ui/status-dot';
import { Radius, Spacing } from '@/constants/theme';
import { useSessionAttendance } from '@/hooks/use-session-attendance';
import { useSessionLeave } from '@/hooks/use-session-leave';
import { useTheme } from '@/hooks/use-theme';
import { formatTimestampToTime } from '@/services/attendanceService';
import type { Practicum, Session } from '@/types/attendance';

interface AttendanceRecapProps {
  practicum: Practicum;
  session: Session;
}

interface UnifiedRecapEntry {
  id: string;
  name: string;
  identifier: string;
  statusLabel: 'Hadir' | 'Izin';
  timeDisplay: string;
}

export function AttendanceRecap({ practicum, session }: AttendanceRecapProps) {
  const theme = useTheme();

  const {
    records,
    loading: attendanceLoading,
    error: attendanceError,
    retry: retryAttendance,
  } = useSessionAttendance(practicum.id, session.id, { role: 'asisten' });

  const {
    leaveRequests,
    loading: leaveLoading,
    error: leaveError,
    retry: retryLeave,
  } = useSessionLeave({
    practicumId: practicum.id,
    sessionId: session.id,
    isAsisten: true,
    loadClassifications: false,
  });

  if (attendanceLoading || leaveLoading) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <LoadingState label="Memuat rekap kehadiran…" />
      </SafeAreaView>
    );
  }

  const loadError = attendanceError ?? leaveError;

  if (loadError) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <ErrorState
          message={loadError}
          onRetry={() => {
            retryAttendance();
            retryLeave();
          }}
        />
      </SafeAreaView>
    );
  }

  const attendanceMap = new Map<string, UnifiedRecapEntry>();

  records.forEach((record) => {
    attendanceMap.set(record.praktikanId, {
      id: `attendance-${record.praktikanId}`,
      name: record.praktikanName,
      identifier: record.praktikanNim,
      statusLabel: 'Hadir',
      timeDisplay: formatTimestampToTime(record.recordedAt),
    });
  });

  // Izin yang disetujui hanya mengisi praktikan yang belum tercatat hadir.
  leaveRequests
    .filter((request) => request.status === 'approved')
    .forEach((request) => {
      if (attendanceMap.has(request.praktikanId)) {
        return;
      }

      attendanceMap.set(request.praktikanId, {
        id: `leave-${request.praktikanId}`,
        name: request.praktikanName,
        identifier: request.praktikanNim,
        statusLabel: 'Izin',
        timeDisplay: formatTimestampToTime(request.decidedAt ?? request.createdAt),
      });
    });

  const entries: UnifiedRecapEntry[] = Array.from(attendanceMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const hadirCount = entries.filter((entry) => entry.statusLabel === 'Hadir').length;
  const izinCount = entries.filter((entry) => entry.statusLabel === 'Izin').length;

  const renderHeader = () => (
    <View style={styles.header}>
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{practicum.name}</Text>
          <StatusBadge status={session.status} />
        </View>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          {session.date} · {session.startTime}–{session.endTime} · {practicum.className}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <Text style={[styles.count, { color: theme.textSecondary }]}>
          {entries.length} data tercatat ({hadirCount} Hadir, {izinCount} Izin)
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            title="Belum ada kehadiran"
            description="Kehadiran dan izin yang dicatat akan muncul di sini secara real-time."
          />
        }
        renderItem={({ item, index }) => {
          const isFirst = index === 0;
          const isLast = index === entries.length - 1;

          return (
            <View
              style={[
                styles.groupItem,
                { backgroundColor: theme.surface, borderColor: theme.border },
                isFirst && styles.groupFirst,
                isLast && styles.groupLast,
                !isLast && styles.groupDivider,
              ]}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>
                    {item.identifier}
                  </Text>
                </View>

                <View style={styles.badgeContainer}>
                  <StatusDot
                    label={item.statusLabel}
                    tone={item.statusLabel === 'Hadir' ? 'success' : 'warning'}
                  />
                  <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                    {item.timeDisplay}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  header: { gap: Spacing.two, marginBottom: Spacing.two },
  summaryCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  title: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '700', lineHeight: 26 },
  meta: { fontSize: 14, lineHeight: 20 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  groupItem: { borderLeftWidth: 1, borderRightWidth: 1, padding: Spacing.three },
  groupFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  groupLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.lg,
  },
  groupDivider: { borderBottomWidth: 1 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  badgeContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
  },
});
