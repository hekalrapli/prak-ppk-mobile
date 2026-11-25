import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScheduleListItem } from '@/components/attendance/schedule-list-item';
import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { SegmentedControl, type SegmentOption } from '@/components/ui/segmented-control';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { usePracticumDetail } from '@/hooks/use-practicum-detail';
import { useTheme } from '@/hooks/use-theme';
import {
  addPracticumParticipant,
  deletePracticumCascade,
  getPracticumDeleteSummary,
  removePracticumParticipant,
  searchPraktikanByNimOrEmail,
} from '@/services/scheduleService';
import { useAuth } from '@/store/auth-context';
import type { UserProfile } from '@/types/auth';

type ManageTab = 'info' | 'peserta';

export default function PracticumManageScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { showToast } = useToast();
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
  const [deleteSummary, setDeleteSummary] = useState<{
    sessionCount: number;
    attendanceCount: number;
  } | null>(null);
  const [checkingDelete, setCheckingDelete] = useState(false);
  const [deletingPracticum, setDeletingPracticum] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addingUid, setAddingUid] = useState<string | null>(null);
  const [participantToRemove, setParticipantToRemove] =
    useState<UserProfile | null>(null);
  const [removingParticipant, setRemovingParticipant] = useState(false);

  const busyRef = useRef(false);

  if (!practicumId) {
    return (
      <DetailScreen title="Kelola Praktikum">
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
      <DetailScreen title="Kelola Praktikum">
        <View style={styles.fallback}>
          <LoadingState label="Memuat praktikum…" />
        </View>
      </DetailScreen>
    );
  }

  if (error) {
    return (
      <DetailScreen title="Kelola Praktikum">
        <View style={styles.fallback}>
          <ErrorState message={error} onRetry={retry} />
        </View>
      </DetailScreen>
    );
  }

  if (!practicum) {
    return (
      <DetailScreen title="Kelola Praktikum">
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

  const handleRequestDeletePracticum = async () => {
    if (checkingDelete || busyRef.current) {
      return;
    }

    setCheckingDelete(true);
    try {
      const summary = await getPracticumDeleteSummary(practicum.id);
      setDeleteSummary(summary);
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : 'Gagal memeriksa data sesi praktikum.',
        'error'
      );
    } finally {
      setCheckingDelete(false);
    }
  };

  const handleConfirmDeletePracticum = async () => {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    setDeletingPracticum(true);
    try {
      await deletePracticumCascade(practicum.id);
      setDeleteSummary(null);
      showToast('Praktikum dan seluruh sesinya berhasil dihapus', 'success');
      router.replace('/asisten/manage');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menghapus praktikum.',
        'error'
      );
    } finally {
      busyRef.current = false;
      setDeletingPracticum(false);
    }
  };

  const handleSearchPraktikan = async () => {
    const trimmed = searchKeyword.trim();
    if (!trimmed) {
      setSearchError('Masukkan NIM atau email praktikan.');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const results = await searchPraktikanByNimOrEmail(trimmed);
      setSearchResults(results);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : 'Gagal mencari akun praktikan.'
      );
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddParticipant = async (user: UserProfile) => {
    if (busyRef.current) {
      return;
    }

    if (studentIds.includes(user.uid)) {
      showToast('Praktikan ini sudah terdaftar sebagai peserta.', 'error');
      return;
    }

    busyRef.current = true;
    setAddingUid(user.uid);
    try {
      await addPracticumParticipant(practicum.id, user.uid);
      showToast(`${user.name} ditambahkan sebagai peserta`, 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menambahkan peserta.',
        'error'
      );
    } finally {
      busyRef.current = false;
      setAddingUid(null);
    }
  };

  const handleConfirmRemoveParticipant = async () => {
    if (!participantToRemove || busyRef.current) {
      return;
    }

    busyRef.current = true;
    setRemovingParticipant(true);
    try {
      await removePracticumParticipant(practicum.id, participantToRemove.uid);
      showToast(
        `${participantToRemove.name} dihapus dari peserta praktikum`,
        'success'
      );
      setParticipantToRemove(null);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menghapus peserta.',
        'error'
      );
    } finally {
      busyRef.current = false;
      setRemovingParticipant(false);
    }
  };

  const deleteWarningMessage = deleteSummary
    ? deleteSummary.attendanceCount > 0
      ? `PERINGATAN: Praktikum "${practicum.name}" memiliki ${deleteSummary.sessionCount} sesi dan ${deleteSummary.attendanceCount} data kehadiran tercatat. Menghapus praktikum akan ikut menghapus seluruh sesi dan data terkait secara permanen.`
      : `Praktikum "${practicum.name}" beserta ${deleteSummary.sessionCount} sesi di dalamnya akan dihapus secara permanen.`
    : '';

  return (
    <DetailScreen title="Kelola Praktikum">
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
                    label="Ubah praktikum"
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: '/asisten/practicum/form',
                        params: { practicumId: practicum.id },
                      })
                    }
                  />
                </View>
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

            <View style={styles.dangerSection}>
              <AppButton
                label="Hapus praktikum"
                variant="destructive"
                loading={checkingDelete || deletingPracticum}
                onPress={handleRequestDeletePracticum}
              />
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
                Tambah Peserta Praktikan
              </Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                Cari akun terdaftar berperan praktikan menggunakan NIM atau
                alamat email lengkap.
              </Text>

              <AppTextField
                label="NIM atau email praktikan"
                placeholder="Contoh: 2211102034 atau nabila@contoh.com"
                value={searchKeyword}
                onChangeText={(value) => {
                  setSearchKeyword(value);
                  if (searchError) setSearchError(null);
                }}
                error={searchError ?? undefined}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={handleSearchPraktikan}
              />

              <AppButton
                label="Cari praktikan"
                variant="secondary"
                loading={searching}
                onPress={handleSearchPraktikan}
              />

              {hasSearched && !searching ? (
                searchResults.length === 0 ? (
                  <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                    Tidak ditemukan akun praktikan dengan NIM atau email tersebut.
                  </Text>
                ) : (
                  <View style={styles.resultList}>
                    {searchResults.map((candidate) => {
                      const alreadyAdded = studentIds.includes(candidate.uid);
                      return (
                        <View
                          key={candidate.uid}
                          style={[
                            styles.participantRow,
                            {
                              backgroundColor: theme.surfaceSubtle,
                              borderColor: theme.border,
                            },
                          ]}>
                          <View style={styles.participantInfo}>
                            <Text
                              style={[
                                styles.participantName,
                                { color: theme.textPrimary },
                              ]}>
                              {candidate.name}
                            </Text>
                            <Text
                              style={[
                                styles.participantMeta,
                                { color: theme.textSecondary },
                              ]}>
                              {candidate.identifier} · {candidate.email}
                            </Text>
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            disabled={alreadyAdded || addingUid === candidate.uid}
                            onPress={() => handleAddParticipant(candidate)}
                            style={[
                              styles.pillBtn,
                              {
                                backgroundColor: alreadyAdded
                                  ? theme.disabledBg
                                  : theme.primary,
                              },
                            ]}>
                            <Text
                              style={[
                                styles.pillBtnLabel,
                                {
                                  color: alreadyAdded
                                    ? theme.disabledText
                                    : theme.onPrimary,
                                },
                              ]}>
                              {alreadyAdded
                                ? 'Terdaftar'
                                : addingUid === candidate.uid
                                  ? 'Menambah…'
                                  : 'Tambah'}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )
              ) : null}
            </View>

            <View
              style={[
                styles.card,
                Shadow.soft,
                { backgroundColor: theme.surface },
              ]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Daftar Peserta Saat Ini ({studentIds.length})
              </Text>

              {participantsLoading ? (
                <LoadingState label="Memuat daftar peserta…" />
              ) : studentIds.length === 0 ? (
                <Text style={[styles.helperText, { color: theme.textSecondary }]}>
                  Belum ada praktikan yang terdaftar di praktikum ini.
                </Text>
              ) : (
                participants.map((student) => (
                  <View
                    key={student.uid}
                    style={[
                      styles.participantRow,
                      {
                        backgroundColor: theme.surfaceSubtle,
                        borderColor: theme.border,
                      },
                    ]}>
                    <View style={styles.participantInfo}>
                      <Text
                        style={[
                          styles.participantName,
                          { color: theme.textPrimary },
                        ]}>
                        {student.name}
                      </Text>
                      <Text
                        style={[
                          styles.participantMeta,
                          { color: theme.textSecondary },
                        ]}>
                        {student.identifier} · {student.email}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setParticipantToRemove(student)}
                      style={[
                        styles.pillBtn,
                        styles.removePillBtn,
                        { borderColor: theme.border },
                      ]}>
                      <Text style={[styles.pillBtnLabel, { color: theme.error }]}>
                        Hapus
                      </Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        )}
      </View>

      <ConfirmModal
        visible={deleteSummary !== null}
        destructive
        title="Hapus praktikum?"
        message={deleteWarningMessage}
        confirmLabel={deletingPracticum ? 'Menghapus…' : 'Hapus'}
        onCancel={() => {
          if (!deletingPracticum) {
            setDeleteSummary(null);
          }
        }}
        onConfirm={handleConfirmDeletePracticum}
      />

      <ConfirmModal
        visible={participantToRemove !== null}
        destructive
        title="Hapus peserta?"
        message={
          participantToRemove
            ? `Hapus ${participantToRemove.name} (${participantToRemove.identifier}) dari daftar peserta ${practicum.name}?`
            : ''
        }
        confirmLabel={removingParticipant ? 'Menghapus…' : 'Hapus'}
        onCancel={() => {
          if (!removingParticipant) {
            setParticipantToRemove(null);
          }
        }}
        onConfirm={handleConfirmRemoveParticipant}
      />
    </DetailScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: { ...Typography.screenTitle, fontSize: 22, lineHeight: 28 },
  meta: { ...Typography.caption },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  section: { gap: Spacing.two },
  sectionTitle: { ...Typography.sectionTitle },
  dangerSection: { marginTop: Spacing.two },
  helperText: { ...Typography.body },
  resultList: { gap: Spacing.two },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  participantInfo: { flex: 1, minWidth: 0, gap: 2 },
  participantName: { ...Typography.bodyStrong },
  participantMeta: { ...Typography.caption },
  pillBtn: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePillBtn: {
    borderWidth: 1,
  },
  pillBtnLabel: { ...Typography.label },
});
