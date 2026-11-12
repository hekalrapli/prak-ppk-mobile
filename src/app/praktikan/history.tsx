// src/app/praktikan/history.tsx
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttendanceRecordItem } from '@/components/attendance/attendance-record-item';
import { EmptyState } from '@/components/ui/empty-state';
import { AICategoryBadge } from '@/components/leave/ai-category-badge';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDemoData } from '@/store/demo-data-context';
import { AttendanceRecord, LeaveRequest, Practicum, Session } from '@/types/attendance';
import { subscribeUserLeaveRequests } from '@/services/leaveService';

interface HistoryEntry {
  record: AttendanceRecord;
  session: Session;
  practicum: Practicum;
}

export default function PraktikanHistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { state } = useDemoData();
  const [activeTab, setActiveTab] = useState<'attendance' | 'leave'>('attendance');
  const [leaveList, setLeaveList] = useState<LeaveRequest[]>([]);

  const user = state.users.find((candidate) => candidate.id === state.activeUserId);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeUserLeaveRequests(
      user.id,
      (data) => {
        setLeaveList(data);
      },
      () => {
        // Fallback local demo state
        const local = (state.leaveRequests || []).filter(
          (lr) => lr.praktikanId === user.id
        );
        setLeaveList(local);
      }
    );

    return () => unsubscribe();
  }, [user, state.leaveRequests]);

  if (!user) {
    return <Redirect href="/" />;
  }

  if (state.activeRole !== 'praktikan' || user.role !== 'praktikan') {
    return <Redirect href={state.activeRole === 'asisten' ? '/asisten' : '/'} />;
  }

  const entries: HistoryEntry[] = state.attendanceRecords
    .filter((record) => record.praktikanId === user.id)
    .map((record) => {
      const session = state.sessions.find((candidate) => candidate.id === record.sessionId);
      const practicum = session
        ? state.practicums.find((candidate) => candidate.id === session.practicumId)
        : undefined;

      return { record, session, practicum };
    })
    .filter((entry): entry is HistoryEntry => Boolean(entry.session && entry.practicum))
    .reverse();

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: theme.surfaceSubtle, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'attendance' && { backgroundColor: theme.surface }]}
          onPress={() => setActiveTab('attendance')}>
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'attendance' ? theme.textPrimary : theme.textSecondary },
            ]}>
            Kehadiran ({entries.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'leave' && { backgroundColor: theme.surface }]}
          onPress={() => setActiveTab('leave')}>
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'leave' ? theme.textPrimary : theme.textSecondary },
            ]}>
            Izin Saya ({leaveList.length})
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.caption, { color: theme.textSecondary }]}>
        {activeTab === 'attendance'
          ? 'Hanya menampilkan data kehadiran Anda.'
          : 'Daftar pengajuan izin dan status verifikasi oleh asisten.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      {activeTab === 'attendance' ? (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.record.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <EmptyState
              title="Belum ada riwayat kehadiran"
              description="Catat kehadiran pada sesi yang dibuka untuk melihat riwayat."
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
                  recordedAt={item.record.recordedAt}
                  onPress={() =>
                    router.push({
                      pathname: '/praktikan/session/[sessionId]',
                      params: { sessionId: item.session.id },
                    })
                  }
                />
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={leaveList}
          keyExtractor={(item) => item.id || item.sessionId || String(Math.random())}
          contentContainerStyle={styles.content}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <EmptyState
              title="Belum ada pengajuan izin"
              description="Ajukan izin melalui halaman detail sesi yang tidak dapat Anda ikuti."
            />
          }
          renderItem={({ item }) => {
            const session = state.sessions.find((s) => s.id === item.sessionId);
            const practicum = session
              ? state.practicums.find((p) => p.id === session.practicumId)
              : undefined;

            const isPending = item.status === 'pending';
            const isApproved = item.status === 'approved';

            return (
              <View
                style={[
                  styles.leaveCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}>
                <View style={styles.leaveHeader}>
                  <Text style={[styles.leaveTitle, { color: theme.textPrimary }]}>
                    {practicum?.name || item.practicumName || 'Praktikum'}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isPending
                          ? '#fef3c7'
                          : isApproved
                          ? '#dcfce7'
                          : '#fee2e2',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color: isPending
                            ? '#92400e'
                            : isApproved
                            ? '#166534'
                            : '#991b1b',
                        },
                      ]}>
                      {isPending ? 'Menunggu' : isApproved ? 'Diterima' : 'Ditolak'}
                    </Text>
                  </View>
                </View>

                {session?.date ? (
                  <Text style={[styles.leaveMeta, { color: theme.textSecondary }]}>
                    {session.date} ({session.startTime}–{session.endTime})
                  </Text>
                ) : null}

                <Text style={[styles.reasonText, { color: theme.textPrimary }]}>
                  "{item.reason}"
                </Text>

                {/* AI Category chip (FR-18) */}
                <AICategoryBadge ai={item.ai} />

                {item.reviewNote ? (
                  <View style={[styles.noteBox, { backgroundColor: theme.surfaceSubtle }]}>
                    <Text style={[styles.noteLabel, { color: theme.textSecondary }]}>
                      Catatan Asisten:
                    </Text>
                    <Text style={[styles.noteContent, { color: theme.textPrimary }]}>
                      {item.reviewNote}
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
  tabBar: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: 3,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  caption: { fontSize: 13, lineHeight: 18, marginTop: 2 },
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
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  leaveMeta: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  statusPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reasonText: {
    fontSize: 13,
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
    fontSize: 11,
    fontWeight: '600',
  },
  noteContent: {
    fontSize: 12,
    marginTop: 2,
  },
});
