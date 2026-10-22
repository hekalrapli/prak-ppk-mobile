import { Redirect, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScheduleListItem, StatusLegend } from '@/components/attendance/schedule-list-item';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDemoData } from '@/store/demo-data-context';

export default function PraktikanScheduleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { state } = useDemoData();
  const activeUser = state.users.find((user) => user.id === state.activeUserId);

  if (!activeUser) {
    return <Redirect href="/" />;
  }

  if (state.activeRole !== 'praktikan' || activeUser.role !== 'praktikan') {
    return <Redirect href={state.activeRole === 'asisten' ? '/asisten' : '/'} />;
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.greeting, { color: theme.textPrimary }]}>
        Halo, {activeUser.name}
      </Text>
      <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
        {activeUser.identifier}
        {activeUser.className ? ` · ${activeUser.className}` : ''}
      </Text>

      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Jadwal Praktikum{' '}
          <Text style={[styles.count, { color: theme.textSecondary }]}>
            ({state.sessions.length} sesi)
          </Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/praktikan/history')}
          style={({ pressed }) => pressed && styles.pressed}>
          <Text style={[styles.link, { color: theme.primary }]}>Riwayat</Text>
        </Pressable>
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

          return (
            <ScheduleListItem
              session={item}
              practicum={practicum}
              onPress={() =>
                router.push({
                  pathname: '/praktikan/session/[sessionId]',
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
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '600', lineHeight: 26 },
  count: { fontSize: 14, fontWeight: '400' },
  link: { fontSize: 14, fontWeight: '600', paddingVertical: Spacing.two },
  pressed: { opacity: 0.6 },
  empty: { paddingVertical: Spacing.five, alignItems: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptyBody: { fontSize: 16, textAlign: 'center' },
});
