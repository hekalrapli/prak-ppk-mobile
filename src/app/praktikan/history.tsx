import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDemoData } from '@/store/demo-data-context';

export default function PraktikanHistoryScreen() {
  const theme = useTheme();
  const { state } = useDemoData();
  const user = state.users.find((candidate) => candidate.id === state.activeUserId);

  if (!user) {
    return <Redirect href="/" />;
  }

  if (state.activeRole !== 'praktikan' || user.role !== 'praktikan') {
    return <Redirect href={state.activeRole === 'asisten' ? '/asisten' : '/'} />;
  }

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.empty,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Belum ada riwayat kehadiran
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Riwayat kehadiran Anda akan muncul di sini setelah fitur presensi
            diimplementasikan pada tahap berikutnya.
          </Text>
        </View>
      </ScrollView>
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
  empty: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
});
