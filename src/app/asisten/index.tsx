import { Redirect, useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScheduleListItem, StatusLegend } from '@/components/attendance/schedule-list-item';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDemoData } from '@/store/demo-data-context';

export default function AsistenScheduleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { state } = useDemoData();
  const activeUser = state.users.find((user) => user.id === state.activeUserId);

  if (!activeUser) {
    return <Redirect href="/" />;
  }

  if (state.activeRole !== 'asisten' || activeUser.role !== 'asisten') {
    return <Redirect href={state.activeRole === 'praktikan' ? '/praktikan' : '/'} />;
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.greeting, { color: theme.textPrimary }]}>
        Halo, {activeUser.name}
      </Text>
      <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
        Asisten · {activeUser.identifier}
      </Text>

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Sesi Praktikum{' '}
          <Text style={[styles.count, { color: theme.textSecondary }]}>
            ({state.sessions.length} sesi)
          </Text>
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={state.sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={<StatusLegend />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              Belum ada jadwal
            </Text>
            <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
              Jadwal praktikum akan muncul di sini.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const practicum = state.practicums.find((candidate) => candidate.id === item.practicumId);

          if (!practicum) {
            return null;
          }

          const assistant = state.users.find(
            (candidate) => candidate.id === practicum.assistantId
          );

          return (
            <ScheduleListItem
              session={item}
              practicum={practicum}
              assistantName={assistant?.name}
              isAssignedToActiveUser={practicum.assistantId === activeUser.id}
              onPress={() =>
                router.push({
                  pathname: '/asisten/session/[sessionId]',
                  params: { sessionId: item.id },
                })
              }
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  header: { marginBottom: Spacing.three },
  greeting: { fontSize: 24, fontWeight: '700', lineHeight: 32, marginBottom: Spacing.one },
  userMeta: { fontSize: 14, lineHeight: 20, marginBottom: Spacing.four },
  sectionRow: { marginBottom: Spacing.two },
  sectionTitle: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  count: { fontSize: 14, fontWeight: '400' },
  empty: { paddingVertical: Spacing.five, alignItems: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyBody: { fontSize: 16, textAlign: 'center' },
});
