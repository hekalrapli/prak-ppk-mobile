import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScheduleListItem } from '@/components/attendance/schedule-list-item';
import { AppButton } from '@/components/ui/app-button';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { SegmentedControl, type SegmentOption } from '@/components/ui/segmented-control';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { usePracticumDetail } from '@/hooks/use-practicum-detail';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-context';

type ManageTab = 'info' | 'peserta';

/**
 * FR-S4-P2-01: Ruang kerja Asprak (asisten) khusus pengelolaan sesi.
 * Seluruh aksi CRUD praktikum dan distribusi praktikan telah dipindahkan ke peran Aslab.
 * Asprak hanya dapat melihat info kelas, menambah sesi praktikum, dan melihat daftar peserta.
 */
export default function PracticumManageScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { practicumId } = useLocalSearchParams<{ practicumId: string }>();

  const {
    practicum,
    sessions,
    participants,
    participantsLoading,
    loading,
    error,
    retry,
  } = usePracticumDetail(practicumId);

  const [activeTab, setActiveTab] = useState<ManageTab>('info');

  if (!practicumId) {
    return (
      <DetailScreen title="Detail Praktikum">
        <View style={styles.fallback}>
          <EmptyState
            title="Praktikum tidak ditemukan"
            description="Praktikum yang Anda cari tidak tersedia."
            actionLabel="Kembali ke jadwal"
            onAction={() => router.replace('/asisten')}
          />
        </View>
      </DetailScreen>
    );
  }

  if (loading) {
    return (
      <DetailScreen title="Detail Praktikum">
        <View style={styles.fallback}>
          <LoadingState label="Memuat praktikum…" />
        </View>
      </DetailScreen>
    );
  }

  if (error) {
    return (
      <DetailScreen title="Detail Praktikum">
        <View style={styles.fallback}>
          <ErrorState message={error} onRetry={retry} />
        </View>
      </DetailScreen>
    );
  }

  if (!practicum) {
    return (
      <DetailScreen title="Detail Praktikum">
        <View style={styles.fallback}>
          <EmptyState
            title="Praktikum tidak ditemukan"
            description="Praktikum yang Anda cari tidak tersedia atau sudah dihapus."
            actionLabel="Kembali ke jadwal"
            onAction={() => router.replace('/asisten')}
          />
        </View>
      </DetailScreen>
    );
  }

  const canManage =
    profile?.role === 'asisten' && practicum.assistantId === profile.uid;
  if (!canManage) {
    return <Redirect href="/asisten" />;
  }

  const studentIds = practicum.studentIds ?? [];

  const tabOptions: SegmentOption<ManageTab>[] = [
    { value: 'info', label: 'Sesi & Info', count: sessions.length },
    { value: 'peserta', label: 'Peserta', count: studentIds.length },
  ];

  return (
    <DetailScreen title="Detail Praktikum">
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
        ]}>
        <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

        <View style={styles.tabsWrap}>
          <SegmentedControl<ManageTab>
            options={tabOptions}
            value={activeTab}
            onChange={setActiveTab}
          />
        </View>

        {activeTab === 'info' ? (
          <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
            <View
              style={[
                styles.card,
                Shadow.soft,
                { backgroundColor: theme.surface },
              ]}>
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                {practicum.name}
              </Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                Kelas {practicum.className} · {studentIds.length} peserta ·{' '}
                {sessions.length} sesi
              </Text>

              <View style={styles.actionRow}>
                <View style={styles.flex}>
                  <AppButton
                    label="Tambah sesi"
                    onPress={() =>
                      router.push({
                        pathname: '/asisten/session/form',
                        params: { practicumId: practicum.id },
                      })
                    }
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Daftar Sesi ({sessions.length})
              </Text>

              {sessions.length === 0 ? (
                <EmptyState
                  title="Belum ada sesi"
                  description="Tambahkan sesi jadwal untuk praktikum ini."
                  actionLabel="Tambah sesi"
                  onAction={() =>
                    router.push({
                      pathname: '/asisten/session/form',
                      params: { practicumId: practicum.id },
                    })
                  }
                />
              ) : (
                sessions.map((session) => (
                  <ScheduleListItem
                    key={session.id}
                    practicum={practicum}
                    session={session}
                    assistantName={practicum.assistantName ?? profile?.name}
                    participantCount={studentIds.length}
                    onPress={() =>
                      router.push({
                        pathname: '/asisten/session/[sessionId]',
                        params: {
                          sessionId: session.id,
                          practicumId: practicum.id,
                        },
                      })
                    }
                  />
                ))
              )}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            <View
              style={[
                styles.card,
                Shadow.soft,
                { backgroundColor: theme.surface },
              ]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Daftar Peserta Praktikan ({studentIds.length})
              </Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                Distribusi dan perpindahan peserta dikelola oleh Aslab melalui dashboard laboratorium.
              </Text>
            </View>

            {participantsLoading ? (
              <LoadingState label="Memuat data peserta…" />
            ) : participants.length === 0 ? (
              <EmptyState
                title="Belum ada peserta"
                description="Praktikan untuk kelas ini belum didistribusikan oleh Aslab."
              />
            ) : (
              <View style={styles.participantList}>
                {participants.map((item) => (
                  <View
                    key={item.uid}
                    style={[
                      styles.participantRow,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}>
                    <View style={styles.participantInfo}>
                      <Text
                        style={[
                          styles.participantName,
                          { color: theme.textPrimary },
                        ]}>
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.participantMeta,
                          { color: theme.textSecondary },
                        ]}>
                        {item.identifier} · {item.email}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, justifyContent: 'center', padding: Spacing.three },
  sheet: {
    flex: 1,
    marginTop: -Spacing.four,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.two,
  },
  tabsWrap: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  flex: { flex: 1 },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  title: { ...Typography.sectionTitle },
  meta: { ...Typography.caption },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    ...Typography.bodyStrong,
    fontSize: 16,
  },
  participantList: {
    gap: Spacing.two,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.two,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  participantInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  participantName: {
    ...Typography.bodyStrong,
  },
  participantMeta: {
    ...Typography.caption,
  },
});
