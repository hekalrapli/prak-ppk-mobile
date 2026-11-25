import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { ErrorState } from '@/components/ui/screen-state';
import { SkeletonCardList } from '@/components/ui/skeleton';
import { TabScreen } from '@/components/ui/tab-screen';
import { getPracticumPalette } from '@/constants/pastel';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useLaboratories } from '@/hooks/use-laboratories';
import { usePracticumFeed } from '@/hooks/use-practicum-feed';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';
import { useThemeMode } from '@/store/theme-context';

const MAX_PREVIEW_LABS = 3;

export default function AsistenManageScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { scheme } = useThemeMode();
  const { profile } = useAuth();

  const {
    practicums,
    sessions,
    loading: feedLoading,
    refreshing: feedRefreshing,
    error: feedError,
    retry: retryFeed,
    refresh: refreshFeed,
  } = usePracticumFeed('asisten', profile?.uid);

  const {
    labs,
    loading: labsLoading,
    refreshing: labsRefreshing,
    error: labsError,
    retry: retryLabs,
    refresh: refreshLabs,
  } = useLaboratories();

  const isAsisten = profile?.role === 'asisten';
  const assistantUid = profile?.uid;

  const ownedPracticums = useMemo(() => {
    if (!isAsisten || !assistantUid) {
      return [];
    }
    return practicums
      .filter((item) => item.assistantId === assistantUid)
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name) || a.className.localeCompare(b.className)
      );
  }, [isAsisten, practicums, assistantUid]);

  const sessionCountByPracticum = useMemo(() => {
    const counts = new Map<string, number>();
    sessions.forEach((session) => {
      counts.set(session.practicumId, (counts.get(session.practicumId) ?? 0) + 1);
    });
    return counts;
  }, [sessions]);

  const previewLabs = useMemo(() => labs.slice(0, MAX_PREVIEW_LABS), [labs]);

  const handleRefresh = useCallback(() => {
    refreshFeed();
    refreshLabs();
  }, [refreshFeed, refreshLabs]);

  const handleRetry = useCallback(() => {
    retryFeed();
    retryLabs();
  }, [retryFeed, retryLabs]);

  if (feedLoading) {
    return (
      <TabScreen title="Kelola">
        <SkeletonCardList count={3} />
      </TabScreen>
    );
  }

  if (feedError) {
    return (
      <TabScreen title="Kelola">
        <ErrorState message={feedError} onRetry={handleRetry} />
      </TabScreen>
    );
  }

  return (
    <TabScreen title="Kelola">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[theme.primary]}
            onRefresh={handleRefresh}
            refreshing={feedRefreshing || labsRefreshing}
            tintColor={theme.textSecondary}
          />
        }>
        <View style={[styles.statsBar, { backgroundColor: theme.surfaceSubtle }]}>
          <StatItem label="Praktikum" value={ownedPracticums.length} />
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <StatItem label="Sesi" value={sessions.length} />
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <StatItem
            label="Lokasi lab"
            value={labsLoading || labsError ? '—' : labs.length}
          />
        </View>

        {isAsisten ? (
          <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
            <View style={styles.sectionHeadingGroup}>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                Aksi Cepat
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                Tambahkan praktikum baru atau jadwalkan sesi presensi.
              </Text>
            </View>

            <View style={styles.actionStack}>
              {ownedPracticums.length > 0 ? (
                <AppButton
                  label="Tambah sesi"
                  onPress={() => router.push('/asisten/session/form')}
                />
              ) : null}
              <AppButton
                label="Tambah praktikum"
                variant={ownedPracticums.length === 0 ? 'primary' : 'secondary'}
                onPress={() => router.push('/asisten/practicum/form')}
              />
            </View>

            {ownedPracticums.length === 0 ? (
              <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                Buat praktikum terlebih dahulu sebelum menambahkan sesi jadwal.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Praktikum & Peserta
            </Text>
            <View style={[styles.countBadge, { backgroundColor: theme.primarySoft }]}>
              <Text style={[styles.countText, { color: theme.primary }]}>
                {ownedPracticums.length}
              </Text>
            </View>
          </View>

          {ownedPracticums.length === 0 ? (
            <Text style={[styles.emptyCopy, { color: theme.textSecondary }]}>
              Belum ada praktikum yang Anda ampu. Gunakan tombol Tambah praktikum di
              atas untuk mulai mengelola peserta dan sesi.
            </Text>
          ) : (
            <View style={styles.listStack}>
              {ownedPracticums.map((item) => {
                const palette = getPracticumPalette(item.id, scheme);
                const sessionCount = sessionCountByPracticum.get(item.id) ?? 0;

                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Kelola ${item.name} kelas ${item.className}`}
                    onPress={() =>
                      router.push({
                        pathname: '/asisten/practicum/[practicumId]',
                        params: { practicumId: item.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.itemRow,
                      {
                        backgroundColor: pressed
                          ? theme.surfacePressed
                          : theme.surfaceSubtle,
                        borderColor: theme.border,
                      },
                    ]}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: palette.accent },
                      ]}
                    />
                    <View style={styles.itemInfo}>
                      <Text
                        numberOfLines={1}
                        style={[styles.itemName, { color: theme.textPrimary }]}>
                        {item.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.itemMeta, { color: theme.textSecondary }]}>
                        {item.className} · {item.studentIds?.length ?? 0} peserta ·{' '}
                        {sessionCount} sesi
                      </Text>
                    </View>
                    <View style={styles.rowTrail}>
                      <Text style={[styles.manageLink, { color: theme.link }]}>
                        Kelola
                      </Text>
                      <SymbolView
                        name={{
                          ios: 'chevron.right',
                          android: 'chevron_right',
                          web: 'chevron_right',
                        }}
                        size={16}
                        tintColor={theme.link}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleInline}>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                Lokasi Laboratorium
              </Text>
              {!labsLoading && !labsError ? (
                <View
                  style={[styles.countBadge, { backgroundColor: theme.primarySoft }]}>
                  <Text style={[styles.countText, { color: theme.primary }]}>
                    {labs.length}
                  </Text>
                </View>
              ) : null}
            </View>
            {isAsisten ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tambah lokasi lab"
                onPress={() => router.push('/asisten/labs/form')}
                style={({ pressed }) => [
                  styles.inlineAction,
                  pressed && { opacity: 0.72 },
                ]}>
                <SymbolView
                  name={{ ios: 'plus', android: 'add', web: 'add' }}
                  size={16}
                  tintColor={theme.link}
                />
                <Text style={[styles.manageLink, { color: theme.link }]}>
                  Tambah
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Titik koordinat dan radius geofence untuk peta serta validasi presensi.
          </Text>

          {labsLoading ? (
            <Text style={[styles.emptyCopy, { color: theme.textSecondary }]}>
              Memuat lokasi laboratorium…
            </Text>
          ) : labsError ? (
            <Text style={[styles.emptyCopy, { color: theme.error }]}>
              Tidak dapat memuat daftar lokasi laboratorium.
            </Text>
          ) : previewLabs.length === 0 ? (
            <Text style={[styles.emptyCopy, { color: theme.textSecondary }]}>
              Belum ada lokasi lab terdaftar.
            </Text>
          ) : (
            <View style={styles.listStack}>
              {previewLabs.map((lab) => (
                <Pressable
                  key={lab.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ubah lokasi ${lab.nama}`}
                  onPress={() =>
                    router.push({
                      pathname: '/asisten/labs/form',
                      params: { labId: lab.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.itemRow,
                    {
                      backgroundColor: pressed
                        ? theme.surfacePressed
                        : theme.surfaceSubtle,
                      borderColor: theme.border,
                    },
                  ]}>
                  <SymbolView
                    name={{
                      ios: 'mappin.and.ellipse',
                      android: 'location_on',
                      web: 'location_on',
                    }}
                    size={18}
                    tintColor={theme.primary}
                  />
                  <View style={styles.itemInfo}>
                    <Text
                      numberOfLines={1}
                      style={[styles.itemName, { color: theme.textPrimary }]}>
                      {lab.nama}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.itemMeta, { color: theme.textSecondary }]}>
                      {lab.gedung ? `${lab.gedung} · ` : ''}Radius {lab.radius_meter}{' '}
                      m
                    </Text>
                  </View>
                  <SymbolView
                    name={{
                      ios: 'chevron.right',
                      android: 'chevron_right',
                      web: 'chevron_right',
                    }}
                    size={16}
                    tintColor={theme.textSecondary}
                  />
                </Pressable>
              ))}
              {labs.length > MAX_PREVIEW_LABS ? (
                <Text style={[styles.moreHint, { color: theme.textSecondary }]}>
                  +{labs.length - MAX_PREVIEW_LABS} lokasi lab lainnya
                </Text>
              ) : null}
            </View>
          )}

          {isAsisten ? (
            <AppButton
              label="Kelola lokasi lab"
              variant="secondary"
              onPress={() => router.push('/asisten/labs')}
            />
          ) : null}
        </View>
      </ScrollView>
    </TabScreen>
  );
}

function StatItem({ label, value }: { label: string; value: number | string }) {
  const theme = useTheme();

  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: theme.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  statValue: {
    ...Typography.sectionTitle,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    ...Typography.caption,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionHeadingGroup: {
    gap: Spacing.half,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionTitleInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  cardTitle: {
    ...Typography.cardTitle,
    flexShrink: 1,
  },
  cardSubtitle: {
    ...Typography.caption,
  },
  countBadge: {
    minWidth: 26,
    height: 24,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    ...Typography.caption,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  actionStack: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  helperText: {
    ...Typography.caption,
  },
  emptyCopy: {
    ...Typography.body,
  },
  listStack: {
    gap: Spacing.two,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: Radius.full,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemName: {
    ...Typography.bodyStrong,
  },
  itemMeta: {
    ...Typography.caption,
  },
  rowTrail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  manageLink: {
    ...Typography.label,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 44,
    paddingHorizontal: Spacing.one,
  },
  moreHint: {
    ...Typography.caption,
    paddingHorizontal: Spacing.one,
  },
});
