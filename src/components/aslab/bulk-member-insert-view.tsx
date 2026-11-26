import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BulkCsvPanel } from '@/components/aslab/bulk-csv-panel';
import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { SegmentedControl, type SegmentOption } from '@/components/ui/segmented-control';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useLaboratories } from '@/hooks/use-laboratories';
import { useTheme } from '@/hooks/use-theme';
import { addLabMember, searchUsersByRoleForLab } from '@/services/labService';
import type { BulkMemberRowData, BulkParseResult } from '@/types/attendance';
import type { UserProfile } from '@/types/auth';

type InsertMode = 'single' | 'bulk';

interface BulkMemberInsertViewProps {
  kind: 'praktikan' | 'asprak';
}

const COPY = {
  praktikan: {
    title: 'Insert Praktikan ke Lab',
    targetRole: 'praktikan' as const,
    roleLabel: 'Praktikan',
    idLabel: 'NIM',
    searchLabel: 'NIM atau email praktikan',
    searchPlaceholder: 'Contoh: 2211102034 atau nabila@contoh.com',
    searchBtn: 'Cari praktikan',
    notFound: 'Tidak ditemukan akun praktikan dengan NIM atau email tersebut.',
    addedToast: 'ditambahkan ke laboratorium',
  },
  asprak: {
    title: 'Insert Asprak ke Lab',
    targetRole: 'asisten' as const,
    roleLabel: 'Asprak',
    idLabel: 'NIP',
    searchLabel: 'NIP atau email asprak',
    searchPlaceholder: 'Contoh: 2211101008 atau raka@contoh.com',
    searchBtn: 'Cari asprak',
    notFound: 'Tidak ditemukan akun asisten (asprak) dengan NIP atau email tersebut.',
    addedToast: 'ditugaskan ke laboratorium',
  },
};

const MODE_OPTIONS: SegmentOption<InsertMode>[] = [
  { value: 'single', label: 'Tambah Satuan' },
  { value: 'bulk', label: 'Import Bulk' },
];

export function BulkMemberInsertView({ kind }: BulkMemberInsertViewProps) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const copy = COPY[kind];

  const { labs, loading, error, retry } = useLaboratories();
  const [selectedLabId, setSelectedLabId] = useState('');
  const [mode, setMode] = useState<InsertMode>('single');

  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<UserProfile[]>([]);
  const [addingUid, setAddingUid] = useState<string | null>(null);
  const [parseResult, setParseResult] =
    useState<BulkParseResult<BulkMemberRowData> | null>(null);
  const busyRef = useRef(false);

  const selectedLab = useMemo(() => {
    if (labs.length === 0) {
      return null;
    }
    return labs.find((item) => item.id === selectedLabId) ?? labs[0];
  }, [labs, selectedLabId]);

  const existingMemberIds = useMemo(() => {
    if (!selectedLab) {
      return new Set<string>();
    }
    return new Set(
      kind === 'praktikan' ? selectedLab.studentIds : selectedLab.assistantIds
    );
  }, [kind, selectedLab]);

  const handleSelectLab = (labId: string) => {
    setSelectedLabId(labId);
    setParseResult(null);
  };

  const handleSearch = async () => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setSearchError(`Masukkan ${copy.idLabel} atau email ${copy.roleLabel.toLowerCase()}.`);
      return;
    }

    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const found = await searchUsersByRoleForLab(copy.targetRole, trimmed);
      setResults(found);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : `Gagal mencari akun ${copy.roleLabel.toLowerCase()}.`
      );
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (candidate: UserProfile) => {
    if (!selectedLab || busyRef.current) {
      return;
    }

    if (existingMemberIds.has(candidate.uid)) {
      showToast(`${copy.roleLabel} ini sudah terdaftar di laboratorium tujuan.`, 'error');
      return;
    }

    busyRef.current = true;
    setAddingUid(candidate.uid);
    try {
      await addLabMember(selectedLab.id, kind, candidate.uid);
      showToast(`${candidate.name} ${copy.addedToast}`, 'success');
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : `Gagal menambahkan ${copy.roleLabel.toLowerCase()}.`,
        'error'
      );
    } finally {
      busyRef.current = false;
      setAddingUid(null);
    }
  };

  if (loading) {
    return (
      <DetailScreen title={copy.title}>
        <View style={styles.fallback}>
          <LoadingState label="Memuat daftar laboratorium…" />
        </View>
      </DetailScreen>
    );
  }

  if (error) {
    return (
      <DetailScreen title={copy.title}>
        <View style={styles.fallback}>
          <ErrorState message={error} onRetry={retry} />
        </View>
      </DetailScreen>
    );
  }

  if (!selectedLab) {
    return (
      <DetailScreen title={copy.title}>
        <View style={styles.fallback}>
          <EmptyState
            title="Belum ada laboratorium"
            description="Buat laboratorium terlebih dahulu sebelum memasukkan anggota."
            actionLabel="Tambah laboratorium"
            onAction={() => router.replace('/aslab/labs/form')}
          />
        </View>
      </DetailScreen>
    );
  }

  const missingCourse = !selectedLab.courseName.trim();

  return (
    <DetailScreen title={copy.title}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, Spacing.two),
            },
          ]}>
          <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled">
            <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Pilih Laboratorium Tujuan
              </Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                Pilih tepat satu laboratorium tempat {copy.roleLabel.toLowerCase()} akan
                dimasukkan.
              </Text>

              <View style={styles.labList}>
                {labs.map((lab) => {
                  const selected = lab.id === selectedLab.id;
                  const memberCount =
                    kind === 'praktikan'
                      ? lab.studentIds.length
                      : lab.assistantIds.length;
                  return (
                    <Pressable
                      key={lab.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => handleSelectLab(lab.id)}
                      style={[
                        styles.labOption,
                        {
                          backgroundColor: selected
                            ? theme.primarySoft
                            : theme.surfaceSubtle,
                          borderColor: selected ? theme.primary : theme.border,
                        },
                      ]}>
                      <View style={styles.labOptionTop}>
                        <Text
                          numberOfLines={1}
                          style={[styles.labOptionTitle, { color: theme.textPrimary }]}>
                          {lab.nama}
                        </Text>
                        <Text
                          style={[styles.labOptionCount, { color: theme.textSecondary }]}>
                          {memberCount} {copy.roleLabel.toLowerCase()}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[styles.meta, { color: theme.textSecondary }]}>
                        {lab.courseName.trim() || 'Mata kuliah belum diatur'}
                        {lab.gedung ? ` · ${lab.gedung}` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {missingCourse ? (
                <View
                  style={[styles.warningBox, { backgroundColor: theme.warningSoft }]}>
                  <Text style={[styles.warningText, { color: theme.warning }]}>
                    Mata kuliah laboratorium ini belum diisi. Lengkapi terlebih dahulu di
                    menu Ubah laboratorium sebelum menyimpan anggota.
                  </Text>
                </View>
              ) : null}
            </View>

            <SegmentedControl<InsertMode>
              options={MODE_OPTIONS}
              value={mode}
              onChange={setMode}
            />

            {mode === 'single' ? (
              <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Tambah Satu {copy.roleLabel}
                </Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  Tujuan: {selectedLab.nama} ({existingMemberIds.size}{' '}
                  {copy.roleLabel.toLowerCase()} terdaftar)
                </Text>

                <AppTextField
                  label={copy.searchLabel}
                  placeholder={copy.searchPlaceholder}
                  value={keyword}
                  onChangeText={(value) => {
                    setKeyword(value);
                    if (searchError) setSearchError(null);
                  }}
                  error={searchError ?? undefined}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />

                <AppButton
                  label={copy.searchBtn}
                  variant="secondary"
                  loading={searching}
                  onPress={handleSearch}
                />

                {hasSearched && !searching ? (
                  results.length === 0 ? (
                    <Text style={[styles.meta, { color: theme.textSecondary }]}>
                      {copy.notFound}
                    </Text>
                  ) : (
                    <View style={styles.resultList}>
                      {results.map((candidate) => {
                        const alreadyJoined = existingMemberIds.has(candidate.uid);
                        const isAdding = addingUid === candidate.uid;
                        return (
                          <View
                            key={candidate.uid}
                            style={[
                              styles.resultCard,
                              { backgroundColor: theme.surfaceSubtle },
                            ]}>
                            <View style={styles.resultInfo}>
                              <Text
                                numberOfLines={2}
                                style={[styles.resultName, { color: theme.textPrimary }]}>
                                {candidate.name}
                              </Text>
                              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                                {copy.idLabel} {candidate.identifier} · {candidate.email}
                              </Text>
                            </View>
                            <AppButton
                              label={
                                alreadyJoined
                                  ? 'Sudah terdaftar'
                                  : `Tambahkan ke ${selectedLab.nama}`
                              }
                              variant={alreadyJoined ? 'secondary' : 'primary'}
                              disabled={alreadyJoined || Boolean(addingUid) || missingCourse}
                              loading={isAdding}
                              onPress={() => handleAddMember(candidate)}
                            />
                          </View>
                        );
                      })}
                    </View>
                  )
                ) : null}
              </View>
            ) : (
              <BulkCsvPanel
                kind={kind}
                contextReady={Boolean(selectedLab)}
                contextLabel={`Laboratorium tujuan: ${selectedLab.nama}`}
                contextBlockedHint="Pilih laboratorium tujuan terlebih dahulu."
                parseResult={parseResult}
                onParsed={setParseResult}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    gap: Spacing.two,
  },
  sectionTitle: { ...Typography.sectionTitle },
  meta: { ...Typography.caption },
  labList: { gap: Spacing.two },
  labOption: {
    minHeight: 44,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.two,
    gap: 2,
  },
  labOptionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  labOptionTitle: { ...Typography.bodyStrong, flex: 1, minWidth: 0 },
  labOptionCount: { ...Typography.caption },
  warningBox: {
    borderRadius: Radius.md,
    padding: Spacing.two,
  },
  warningText: { ...Typography.caption, fontWeight: '600' },
  resultList: { gap: Spacing.two, marginTop: Spacing.one },
  resultCard: {
    borderRadius: Radius.lg,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  resultInfo: { gap: 2 },
  resultName: { ...Typography.bodyStrong },
});
