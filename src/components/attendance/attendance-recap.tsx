// src/components/attendance/attendance-recap.tsx
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { useDemoData } from '../../store/demo-data-context';
import { EmptyState } from '../ui/empty-state';
import { StatusBadge } from '../ui/status-badge';
import { AttendanceRecordItem } from './attendance-record-item';
import { useSessionAttendance } from '../../hooks/use-session-attendance';
import { formatTimestampToTime } from '../../services/attendanceService';

interface AttendanceRecapProps {
  sessionId: string;
}

interface UnifiedRecapEntry {
  id: string;
  name: string;
  identifier: string;
  statusLabel: 'Hadir' | 'Izin';
  timeDisplay: string;
}

export function AttendanceRecap({ sessionId }: AttendanceRecapProps) {
  const router = useRouter();
  const theme = useTheme();
  const { state } = useDemoData();

  const session = state.sessions.find((candidate) => candidate.id === sessionId);
  const practicum = session
    ? state.practicums.find((candidate) => candidate.id === session.practicumId)
    : undefined;

  const { records: realTimeRecords } = useSessionAttendance(
    practicum?.id || '',
    sessionId
  );
  const realTimeLeaves: any[] = [];

  if (!session || !practicum) {
    return (
      <SafeAreaView
        edges={['bottom']}
        style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.notFound}>
          <EmptyState
            title="Sesi tidak ditemukan"
            description="Sesi yang Anda cari tidak tersedia. Kembali ke jadwal untuk memilih sesi lain."
            actionLabel="Kembali ke jadwal"
            onAction={() => router.replace('/asisten')}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Gabungkan data presensi real-time dan demo state
  const attendanceMap = new Map<string, UnifiedRecapEntry>();

  // 1. Dari demo store
  state.attendanceRecords
    .filter((record) => record.sessionId === sessionId)
    .forEach((record) => {
      const user = state.users.find((u) => u.id === record.praktikanId);
      if (user) {
        attendanceMap.set(user.id, {
          id: record.id,
          name: user.name,
          identifier: user.identifier,
          statusLabel: 'Hadir',
          timeDisplay: record.recordedAt,
        });
      }
    });

  // 2. Dari listener real-time Firestore (FR-15)
  realTimeRecords.forEach((record) => {
    const user = state.users.find((u) => u.id === record.praktikanId);
    attendanceMap.set(record.praktikanId, {
      id: record.id || `att-${record.praktikanId}`,
      name: user?.name || record.praktikanName,
      identifier: user?.identifier || record.praktikanNim,
      statusLabel: 'Hadir',
      timeDisplay: formatTimestampToTime(record.recordedAt),
    });
  });

  // 3. Izin yang disetujui (FR-16 & FR-19)
  realTimeLeaves
    .filter((l) => l.status === 'approved')
    .forEach((l) => {
      const user = state.users.find((u) => u.id === l.praktikanId);
      attendanceMap.set(l.praktikanId, {
        id: `leave-${l.praktikanId}`,
        name: user?.name || l.praktikanName,
        identifier: user?.identifier || l.praktikanNim,
        statusLabel: 'Izin',
        timeDisplay: formatTimestampToTime(l.decidedAt || l.createdAt),
      });
    });

  const entries: UnifiedRecapEntry[] = Array.from(attendanceMap.values());

  const hadirCount = entries.filter((e) => e.statusLabel === 'Hadir').length;
  const izinCount = entries.filter((e) => e.statusLabel === 'Izin').length;

  const renderHeader = () => (
    <View style={styles.header}>
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}>
        <View style={styles.rowBetween}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {practicum.name}
          </Text>
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
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: theme.textPrimary }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>
                    {item.identifier}
                  </Text>
                </View>

                <View style={styles.badgeContainer}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          item.statusLabel === 'Hadir' ? '#dcfce7' : '#fef3c7',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            item.statusLabel === 'Hadir' ? '#166534' : '#92400e',
                        },
                      ]}>
                      {item.statusLabel}
                    </Text>
                  </View>
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
  notFound: { flex: 1, justifyContent: 'center', padding: Spacing.three },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
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
  statusPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
  },
});
