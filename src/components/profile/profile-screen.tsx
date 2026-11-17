import Constants from 'expo-constants';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { Radius, Spacing } from '@/constants/theme';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';
import type { UserRole } from '@/types/attendance';

interface ProfileScreenProps {
  role: UserRole;
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function ProfileScreen({ role }: ProfileScreenProps) {
  const theme = useTheme();
  const { profile, logout } = useAuth();
  const { practicums, loading, error } = usePracticumFeed(role, profile?.uid);
  const [leaving, setLeaving] = useState(false);

  const handleLogout = async () => {
    if (leaving) {
      return;
    }

    setLeaving(true);
    try {
      await logout();
    } finally {
      setLeaving(false);
    }
  };

  const isAsisten = role === 'asisten';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <View style={styles.identityRow}>
            <View style={[styles.avatar, { backgroundColor: theme.surfaceSubtle }]}>
              <Text style={[styles.avatarLabel, { color: theme.textPrimary }]}>
                {initialsOf(profile?.name ?? '') || '—'}
              </Text>
            </View>
            <View style={styles.identityInfo}>
              <Text style={[styles.name, { color: theme.textPrimary }]}>
                {profile?.name ?? '—'}
              </Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                {profile?.identifier ?? '—'}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <ProfileRow label="Email" value={profile?.email ?? '—'} />
          <ProfileRow
            label="Peran"
            value={isAsisten ? 'Asisten pengampu' : 'Praktikan'}
          />
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            {isAsisten ? 'Praktikum yang Anda ampu' : 'Praktikum yang Anda ikuti'}
          </Text>

          {loading ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Memuat praktikum…
            </Text>
          ) : error ? (
            <Text style={[styles.emptyText, { color: theme.error }]}>
              Tidak dapat memuat daftar praktikum.
            </Text>
          ) : practicums.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {isAsisten
                ? 'Belum ada praktikum yang ditugaskan kepada Anda.'
                : 'Belum ada praktikum yang Anda ikuti.'}
            </Text>
          ) : (
            practicums.map((practicum, index) => (
              <View
                key={practicum.id}
                style={[
                  styles.practicumRow,
                  index > 0 && {
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                    paddingTop: Spacing.two,
                  },
                ]}>
                <View style={[styles.dot, { backgroundColor: theme.textTertiary }]} />
                <View style={styles.practicumInfo}>
                  <Text style={[styles.practicumName, { color: theme.textPrimary }]}>
                    {practicum.name}
                  </Text>
                  <Text style={[styles.practicumMeta, { color: theme.textSecondary }]}>
                    {practicum.className}
                    {isAsisten ? '' : practicum.assistantName ? ` · ${practicum.assistantName}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.actions}>
          <AppButton
            label={leaving ? 'Keluar…' : 'Keluar dari akun'}
            loading={leaving}
            onPress={handleLogout}
            variant="secondary"
          />
        </View>

        <Text style={[styles.version, { color: theme.textTertiary }]}>
          PrakPresensi · v{version}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { fontSize: 18, fontWeight: '700' },
  identityInfo: { flex: 1, gap: Spacing.half },
  name: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  meta: { fontSize: 14, lineHeight: 20 },
  divider: { height: 1, marginVertical: Spacing.one },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  detailLabel: { fontSize: 14 },
  detailValue: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  emptyText: { fontSize: 14, lineHeight: 20 },
  practicumRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  practicumInfo: { flex: 1, gap: 2 },
  practicumName: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  practicumMeta: { fontSize: 12, lineHeight: 16 },
  actions: { marginTop: Spacing.one },
  version: { fontSize: 12, textAlign: 'center' },
});
