// src/app/praktikan/history.tsx
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttendanceRecordItem } from '@/components/attendance/attendance-record-item';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/screen-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { StatusDot } from '@/components/ui/status-dot';
import { Radius, Spacing } from '@/constants/theme';
import { useAttendanceHistory, useLeaveHistory } from '@/hooks/use-history';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import { formatTimestampToTime } from '@/services/attendanceService';
import { useAuth } from '@/store/auth-context';
import type {
  AttendanceDoc,
  LeaveRequest,
  Practicum,
  Session,
} from '@/types/attendance';

interface HistoryEntry {
  record: AttendanceDoc;
  session: Session;
  practicum: Practicum;
}

interface LeaveEntry {
  request: LeaveRequest;
  session?: Session;
  practicum?: Practicum;
}

export default function PraktikanHistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave'>('attendance');

  const feed = usePracticumFeed('praktikan', profile?.uid);
  const attendance = useAttendanceHistory(profile?.uid);
  const leave = useLeaveHistory(profile?.uid);

  const sessionsById = useMemo(
    () => new Map(feed.sessions.map((session) => [session.id, session])),
    [feed.sessions]
  );
  const practicumsById = useMemo(
    () => new Map(feed.practicums.map((practicum) => [practicum.id, practicum])),
    [feed.practicums]
  );

  const entries = useMemo<HistoryEntry[]>(
    () =>
      attendance.records.flatMap((record) => {
        const session = sessionsById.get(record.sessionId ?? '');
        const practicum = practicumsById.get(
          record.practicumId ?? session?.practicumId ?? ''
        );

        return session && practicum ? [{ record, session, practicum }] : [];
      }),
    [attendance.records, sessionsById, practicumsById]
  );

  const leaveEntries = useMemo<LeaveEntry[]>(
    () =>
      leave.requests.map((request) => {
        const session = request.sessionId
          ? sessionsById.get(request.sessionId)
          : undefined;
        const practicum = request.practicumId
          ? practicumsById.get(request.practicumId)
          : session
            ? practicumsById.get(session.practicumId)
            : undefined;

        return { request, session, practicum };
      }),
    [leave.requests, sessionsById, practicumsById]
  );

  const loading =
    feed.loading || (activeTab === 'attendance' ? attendance.loading : leave.loading);
  const error =
    feed.error ?? (activeTab === 'attendance' ? attendance.error : leave.error);

  const retry = () => {
    feed.retry();
    if (activeTab === 'attendance') {
      attendance.retry();
    } else {
      leave.retry();
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <SegmentedControl<'attendance' | 'leave'>
        options={[
          { value: 'attendance', label: 'Kehadiran', count: entries.length },
          { value: 'leave', label: 'Izin Saya', count: leaveEntries.length },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <SkeletonCardList count={4} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <ErrorState message={error} onRetry={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      {activeTab === 'attendance' ? (
        <FlatList
          data={entries}
          keyExtractor={(item) => `${item.record.practicumId}-${item.record.sessionId}`}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              colors={[theme.textPrimary]}
              onRefresh={feed.refresh}
              refreshing={feed.refreshing}
              tintColor={theme.textSecondary}
            />
          }
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <EmptyState
              title="Belum ada riwayat kehadiran"
              description="Catat kehadiran untuk melihat riwayat."
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
                <AttendanceRecordItem
                  name={item.practicum.name}
                  meta={item.session.date}
                  recordedAt={formatTimestampToTime(item.record.recordedAt)}
                  onPress={() =>
                    router.push({
                      pathname: '/praktikan/session/[sessionId]',
                      params: {
                        sessionId: item.session.id,
                        practicumId: item.practicum.id,
                      },
                    })
                  }
                />
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={leaveEntries}
          keyExtractor={(item) => `${item.request.practicumId}-${item.request.sessionId}`}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              colors={[theme.textPrimary]}
              onRefresh={feed.refresh}
              refreshing={feed.refreshing}
              tintColor={theme.textSecondary}
            />
          }
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <EmptyState
              title="Belum ada pengajuan izin"
              description="Ajukan izin dari halaman detail sesi."
            />
          }
          renderItem={({ item }) => {
            const isPending = item.request.status === 'pending';
            const isApproved = item.request.status === 'approved';

            return (
              <View
                style={[
                  styles.leaveCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}>
                <View style={styles.leaveHeader}>
                  <Text style={[styles.leaveTitle, { color: theme.textPrimary }]}>
                    {item.practicum?.name ?? 'Praktikum'}
                  </Text>
                  <StatusDot
                    label={isPending ? 'Menunggu' : isApproved ? 'Diterima' : 'Ditolak'}
                    tone={isPending ? 'warning' : isApproved ? 'success' : 'error'}
                  />
                </View>

                {item.session?.date ? (
                  <Text style={[styles.leaveMeta, { color: theme.textSecondary }]}>
                    {item.session.date} ({item.session.startTime}–{item.session.endTime})
                  </Text>
                ) : null}

                <Text style={[styles.reasonText, { color: theme.textPrimary }]}>
                  “{item.request.reason}”
                </Text>

                {item.request.reviewNote ? (
                  <View style={[styles.noteBox, { backgroundColor: theme.surfaceSubtle }]}>
                    <Text style={[styles.noteLabel, { color: theme.textSecondary }]}>
                      Catatan Asisten:
                    </Text>
                    <Text style={[styles.noteContent, { color: theme.textPrimary }]}>
                      {item.request.reviewNote}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
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
  header: { gap: Spacing.two, marginBottom: Spacing.three },
  groupItem: { borderLeftWidth: 1, borderRightWidth: 1 },
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
  leaveCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  leaveTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  leaveMeta: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 15,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
  },
  noteBox: {
    padding: Spacing.two,
    borderRadius: Radius.sm,
    marginTop: Spacing.two,
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  noteContent: {
    fontSize: 13,
    marginTop: 2,
  },
});
