import Constants from 'expo-constants';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
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
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
        <View style={styles.identityRow}>
          <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.avatarLabel, { color: theme.primary }]}>
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
        <ProfileRow label="Peran" value={isAsisten ? 'Asisten pengampu' : 'Praktikan'} />
      </View>

      <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
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
              <View style={[styles.dot, { backgroundColor: theme.accent }]} />
              <View style={styles.practicumInfo}>
                <Text style={[styles.practicumName, { color: theme.textPrimary }]}>
                  {practicum.name}
                </Text>
                <Text style={[styles.practicumMeta, { color: theme.textSecondary }]}>
                  {practicum.className}
                  {isAsisten
                    ? ''
                    : practicum.assistantName
                      ? ` · ${practicum.assistantName}`
                      : ''}
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
          variant="destructive"
        />
      </View>

      <Text style={[styles.version, { color: theme.textTertiary }]}>
        PrakPresensi · v{version}
      </Text>
    </ScrollView>
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
  content: {
    padding: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: { ...Typography.sectionTitle, fontWeight: '700' },
  identityInfo: { flex: 1, gap: Spacing.half },
  name: { ...Typography.screenTitle, fontSize: 22, lineHeight: 28 },
  meta: { ...Typography.body },
  divider: { height: 1, marginVertical: Spacing.one },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  detailLabel: { ...Typography.body },
  detailValue: {
    ...Typography.bodyStrong,
    flexShrink: 1,
    textAlign: 'right',
  },
  sectionTitle: { ...Typography.cardTitle },
  emptyText: { ...Typography.body },
  practicumRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
  practicumInfo: { flex: 1, gap: 2 },
  practicumName: { ...Typography.bodyStrong },
  practicumMeta: { ...Typography.caption },
  actions: { marginTop: Spacing.one },
  version: { ...Typography.caption, textAlign: 'center' },
});
