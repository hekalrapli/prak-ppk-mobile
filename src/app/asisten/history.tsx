import { useRouter } from 'expo-router';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/ui/empty-state';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { useDemoData } from '../../store/demo-data-context';

export default function PraktikanHistoryScreen() {
  const router = useRouter();
  const { state } = useDemoData();
  const theme = Colors.light;

  if (state.activeRole !== 'praktikan' || !state.activeUserId) {
    router.replace('/');
    return null;
  }

  const historyData = state.attendanceRecords
    .filter(record => record.praktikanId === state.activeUserId)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)) 
    .map(record => {
      const session = state.sessions.find(s => s.id === record.sessionId)!;
      const practicum = state.practicums.find(p => p.id === session.practicumId)!;
      return { record, session, practicum };
    });

  const renderHeader = () => {
    if (historyData.length === 0) return null;
    return (
      <View style={styles.header}>
        <Text style={[styles.countText, { color: theme.textSecondary }]}>
          {historyData.length} kehadiran
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: theme.background }]}>
      <FlatList
        data={historyData}
        keyExtractor={item => item.record.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              title="Belum ada riwayat kehadiran"
              description="Anda belum mencatat kehadiran. Kehadiran akan muncul di sini setelah Anda melakukan presensi pada sesi yang dibuka."
              actionLabel="Kembali ke jadwal"
              onAction={() => router.back()}
            />
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.historyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.practicumName, { color: theme.textPrimary }]} numberOfLines={2}>
                {item.practicum.name}
              </Text>
              <View style={[styles.badge, { backgroundColor: theme.successSoft }]}>
                <Text style={[styles.badgeText, { color: theme.success }]}>Hadir</Text>
              </View>
            </View>
            
            <View style={styles.cardFooter}>
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {item.session.date}
              </Text>
              <Text style={[styles.metaText, { color: theme.textSecondary, fontWeight: '600' }]}>
                {item.record.recordedAt}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  listContent: { padding: Spacing.three, paddingBottom: Spacing.five, maxWidth: 560, alignSelf: 'center', width: '100%' },
  header: { marginBottom: Spacing.three, paddingHorizontal: Spacing.one },
  countText: { fontSize: 14, fontWeight: '600' },
  emptyContainer: { flex: 1, marginTop: 40 },
  historyCard: {
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.two,
    gap: Spacing.three,
  },
  practicumName: { flex: 1, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: Radius.xs },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  metaText: { fontSize: 14 },
});