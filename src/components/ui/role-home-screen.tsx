import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';
import { DemoUser, UserRole } from '../../types/attendance';
import { AppButton } from './app-button';

interface RoleHomeScreenProps {
  user: DemoUser;
  role: UserRole;
}

export function RoleHomeScreen({ user, role }: RoleHomeScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const roleLabel = role === 'praktikan' ? 'Praktikan' : 'Asisten';

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>{roleLabel}</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Jadwal</Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <Text style={[styles.greeting, { color: theme.textPrimary }]}>Halo, {user.name}</Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {user.identifier}
            {user.className ? ` · ${user.className}` : ''}
          </Text>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Text style={[styles.cardBody, { color: theme.textSecondary }]}>
            Anda masuk sebagai {roleLabel.toLowerCase()}. Gunakan tombol di bawah untuk
            berganti peran tanpa memulai ulang aplikasi.
          </Text>
        </View>

        <View
          style={[
            styles.placeholder,
            { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
          ]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Jadwal praktikum
          </Text>
          <Text style={[styles.cardBody, { color: theme.textSecondary }]}>
            Daftar sesi, status presensi, dan tindakan per peran akan ditampilkan di sini
            pada tahap implementasi berikutnya.
          </Text>
        </View>

        <View style={styles.spacer} />

        <AppButton label="Ganti peran" variant="secondary" onPress={() => router.replace('/')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  header: { gap: Spacing.one },
  eyebrow: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '700', lineHeight: 38 },
  card: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  greeting: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  meta: { fontSize: 14, lineHeight: 20 },
  divider: { height: 1, marginVertical: Spacing.one },
  cardBody: { fontSize: 16, lineHeight: 24 },
  placeholder: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.three, gap: Spacing.two },
  sectionTitle: { fontSize: 18, fontWeight: '600', lineHeight: 26 },
  spacer: { flex: 1, minHeight: Spacing.four },
});
