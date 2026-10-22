import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useDemoData } from '../../store/demo-data-context';
import { Colors, Spacing } from '../../constants/theme';
import { ScheduleListItem, StatusLegend } from '../../components/attendance/schedule-list-item';

export default function PraktikanScheduleScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { state } = useDemoData();
  const theme = Colors.light;

  // Proteksi: Jika tidak ada user aktif, kembali ke layar pemilihan
  if (!state.activeUserId || state.activeRole !== 'praktikan') {
    router.replace('/');
    return null;
  }

  const activeUser = state.users.find(u => u.id === state.activeUserId);

  // Setup Header Actions (Tombol Ganti Peran)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => router.replace('/')} style={{ padding: 8 }}>
          <Text style={{ color: theme.primary, fontWeight: '600' }}>Ganti peran</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.greeting, { color: theme.textPrimary }]}>Halo, {activeUser?.name}</Text>
      <Text style={[styles.userMeta, { color: theme.textSecondary }]}>
        {activeUser?.identifier} · {activeUser?.className}
      </Text>
      
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Jadwal Praktikum <Text style={{fontWeight: '400', fontSize: 14, color: theme.textSecondary}}>({state.sessions.length} sesi)</Text>
        </Text>
        {/* Tombol Riwayat (FR-09) */}
        <TouchableOpacity onPress={() => router.push('/praktikan/history')}>
          <Text style={{ color: theme.primary, fontWeight: '600' }}>Riwayat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={state.sessions}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={<StatusLegend />}
        renderItem={({ item }) => {
          const practicum = state.practicums.find(p => p.id === item.practicumId)!;
          return (
            <ScheduleListItem
              session={item}
              practicum={practicum}
              onPress={() => router.push(`/praktikan/session/${item.id}`)}
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: Spacing.three, paddingBottom: Spacing.five, maxWidth: 560, alignSelf: 'center', width: '100%' },
  header: { marginBottom: Spacing.three },
  greeting: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  userMeta: { fontSize: 14, marginBottom: Spacing.four },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
});