import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';
import type { UserRole } from '@/types/attendance';

interface ProfileScreenProps {
  role: UserRole;
}

/** Batas tampilan awal agar profil tetap ringkas saat praktikum banyak. */
const MAX_VISIBLE_PRACTICUMS = 4;

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function ProfileScreen({ role }: ProfileScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const { profile, logout } = useAuth();
  const { practicums, loading, error } = usePracticumFeed(role, profile?.uid);
  const [leaving, setLeaving] = useState(false);
  const [showAllPracticums, setShowAllPracticums] = useState(false);

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
  const sortedPracticums = useMemo(
    () => [...practicums].sort((a, b) => a.name.localeCompare(b.name)),
    [practicums]
  );
  const visiblePracticums = showAllPracticums
    ? sortedPracticums
    : sortedPracticums.slice(0, MAX_VISIBLE_PRACTICUMS);
  const hasHiddenPracticums = sortedPracticums.length > MAX_VISIBLE_PRACTICUMS;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
        <View style={styles.identityRow}>
          <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
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
        <ProfileRow label="Peran" value={isAsisten ? 'Asisten pengampu' : 'Praktikan'} />
      </View>

      <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            {isAsisten ? 'Praktikum yang Anda ampu' : 'Praktikum yang Anda ikuti'}
          </Text>
          {!loading && !error ? (
            <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
              {sortedPracticums.length}
            </Text>
          ) : null}
        </View>

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
          visiblePracticums.map((practicum, index) => {
            const canManagePracticum =
              isAsisten &&
              profile?.role === 'asisten' &&
              practicum.assistantId === profile.uid;

            const rowContent = (
              <>
                <View style={[styles.dot, { backgroundColor: theme.accent }]} />
                <View style={styles.practicumInfo}>
                  <Text style={[styles.practicumName, { color: theme.textPrimary }]}>
                    {practicum.name}
                  </Text>
                  <Text style={[styles.practicumMeta, { color: theme.textSecondary }]}>
                    {practicum.className}
                    {isAsisten
                      ? ` · ${practicum.studentIds?.length ?? 0} peserta`
                      : practicum.assistantName
                        ? ` · ${practicum.assistantName}`
                        : ''}
                  </Text>
                </View>
                {canManagePracticum ? (
                  <Text style={[styles.manageLabel, { color: theme.link }]}>
                    Kelola
                  </Text>
                ) : null}
              </>
            );

            if (canManagePracticum) {
              return (
                <Pressable
                  key={practicum.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Kelola ${practicum.name}`}
                  onPress={() =>
                    router.push({
                      pathname: '/asisten/practicum/[practicumId]',
                      params: { practicumId: practicum.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.practicumRow,
                    index > 0 && {
                      borderTopWidth: 1,
                      borderTopColor: theme.border,
                      paddingTop: Spacing.two,
                    },
                    pressed && { opacity: 0.75 },
                  ]}>
                  {rowContent}
                </Pressable>
              );
            }

            return (
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
                {rowContent}
              </View>
            );
          })
        )}

        {hasHiddenPracticums ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showAllPracticums }}
            onPress={() => setShowAllPracticums((value) => !value)}
            style={({ pressed }) => [
              styles.toggle,
              { borderTopColor: theme.border },
              pressed && { opacity: 0.7 },
            ]}>
            <Text style={[styles.toggleText, { color: theme.link }]}>
              {showAllPracticums
                ? 'Tampilkan lebih sedikit'
                : `Lihat semua (${sortedPracticums.length})`}
            </Text>
          </Pressable>
        ) : null}

        {isAsisten && profile?.role === 'asisten' ? (
          <View style={styles.addPracticumWrap}>
            <AppButton
              label="Tambah praktikum"
              variant="secondary"
              onPress={() => router.push('/asisten/practicum/form')}
            />
          </View>
        ) : null}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionTitle: { ...Typography.cardTitle, flexShrink: 1 },
  sectionCount: { ...Typography.label, fontWeight: '400' },
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
  manageLabel: { ...Typography.label, alignSelf: 'center' },
  addPracticumWrap: { marginTop: Spacing.two },
  toggle: {
    minHeight: 44,
    justifyContent: 'center',
    borderTopWidth: 1,
    marginTop: Spacing.one,
  },
  toggleText: { ...Typography.label },
  actions: { marginTop: Spacing.one },
  version: { ...Typography.caption, textAlign: 'center' },
});
