import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { DetailScreen } from '@/components/ui/detail-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, LoadingState } from '@/components/ui/screen-state';
import { SegmentedControl, type SegmentOption } from '@/components/ui/segmented-control';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useLaboratories } from '@/hooks/use-laboratories';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchAslabUsers,
  fetchUsersByIds,
  reassignLabManager,
  transferLabMembers,
  type TransferMemberKind,
} from '@/services/labTransferService';
import type { UserProfile } from '@/types/auth';

const EMPTY_PROFILES = new Map<string, UserProfile>();
const EMPTY_ASLABS: UserProfile[] = [];

const MODE_OPTIONS: SegmentOption<TransferMemberKind>[] = [
  { value: 'praktikan', label: 'Pindah Praktikan' },
  { value: 'asprak', label: 'Pindah Asprak / Aslab' },
];

export default function AslabLabTransferScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ sourceLabId?: string; mode?: string }>();

  const { labs, loading, refreshing, error, retry, refresh } = useLaboratories();

  const initialMode: TransferMemberKind =
    params.mode === 'asprak' ? 'asprak' : 'praktikan';
  const [mode, setMode] = useState<TransferMemberKind>(initialMode);
  const [sourceLabId, setSourceLabId] = useState(params.sourceLabId ?? '');
  const [targetLabId, setTargetLabId] = useState('');
  const [selectedUids, setSelectedUids] = useState<string[]>([]);

  const [profilesState, setProfilesState] = useState<{
    key: string;
    profiles: Map<string, UserProfile>;
  } | null>(null);

  const [aslabAttempt, setAslabAttempt] = useState(0);
  const [aslabState, setAslabState] = useState<{
    attempt: number;
    users: UserProfile[];
  } | null>(null);
  const [nextManagerUid, setNextManagerUid] = useState('');

  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [confirmReassign, setConfirmReassign] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const busyRef = useRef(false);

  const sourceLab = useMemo(() => {
    if (labs.length === 0) {
      return null;
    }
    return labs.find((item) => item.id === sourceLabId) ?? labs[0];
  }, [labs, sourceLabId]);

  const targetCandidates = useMemo(
    () => labs.filter((item) => item.id !== sourceLab?.id),
    [labs, sourceLab?.id]
  );

  const targetLab = useMemo(() => {
    if (targetCandidates.length === 0) {
      return null;
    }
    return targetCandidates.find((item) => item.id === targetLabId) ?? targetCandidates[0];
  }, [targetCandidates, targetLabId]);

  const sourceMemberUids = useMemo(() => {
    if (!sourceLab) {
      return [];
    }
    return mode === 'praktikan' ? sourceLab.studentIds : sourceLab.assistantIds;
  }, [mode, sourceLab]);

  const sourceManagerUid = sourceLab?.managedByAslabId ?? '';

  const memberIdsKey = useMemo(
    () =>
      [
        ...sourceMemberUids,
        ...(sourceManagerUid ? [sourceManagerUid] : []),
      ]
        .sort()
        .join('|'),
    [sourceMemberUids, sourceManagerUid]
  );

  useEffect(() => {
    if (!memberIdsKey) {
      return;
    }

    const uids = memberIdsKey.split('|');
    let cancelled = false;
    void fetchUsersByIds(uids).then((profiles) => {
      if (!cancelled) {
        setProfilesState({ key: memberIdsKey, profiles });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [memberIdsKey]);

  const profilesByUid =
    profilesState?.key === memberIdsKey ? profilesState.profiles : EMPTY_PROFILES;
  const loadingProfiles =
    Boolean(memberIdsKey) && profilesState?.key !== memberIdsKey;

  useEffect(() => {
    if (mode !== 'asprak') {
      return;
    }

    let cancelled = false;
    void fetchAslabUsers()
      .then((users) => {
        if (!cancelled) {
          setAslabState({ attempt: aslabAttempt, users });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAslabState({ attempt: aslabAttempt, users: EMPTY_ASLABS });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mode, aslabAttempt]);

  const aslabUsers =
    aslabState?.attempt === aslabAttempt ? aslabState.users : EMPTY_ASLABS;
  const loadingAslabs =
    mode === 'asprak' && aslabState?.attempt !== aslabAttempt;

  const activeSelectedUids = useMemo(() => {
    const validSet = new Set(sourceMemberUids);
    return selectedUids.filter((uid) => validSet.has(uid));
  }, [selectedUids, sourceMemberUids]);

  const otherAslabCandidates = useMemo(
    () =>
      aslabUsers.filter((item) => item.uid !== sourceLab?.managedByAslabId),
    [aslabUsers, sourceLab?.managedByAslabId]
  );

  const selectedNextManager = useMemo(() => {
    if (otherAslabCandidates.length === 0) {
      return null;
    }
    return (
      otherAslabCandidates.find((item) => item.uid === nextManagerUid) ??
      otherAslabCandidates[0]
    );
  }, [otherAslabCandidates, nextManagerUid]);

  const handleChangeMode = (nextMode: TransferMemberKind) => {
    setMode(nextMode);
    setSelectedUids([]);
  };

  const handleSelectSourceLab = (id: string) => {
    setSourceLabId(id);
    setSelectedUids([]);
    if (targetLabId === id) {
      setTargetLabId('');
    }
  };

  const toggleMember = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((item) => item !== uid) : [...prev, uid]
    );
  };

  const handleToggleSelectAll = () => {
    if (activeSelectedUids.length === sourceMemberUids.length) {
      setSelectedUids([]);
    } else {
      setSelectedUids([...sourceMemberUids]);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!sourceLab || !targetLab || activeSelectedUids.length === 0 || busyRef.current) {
      return;
    }

    busyRef.current = true;
    setSubmitting(true);
    try {
      const result = await transferLabMembers({
        kind: mode,
        sourceLabId: sourceLab.id,
        targetLabId: targetLab.id,
        memberUids: activeSelectedUids,
      });
      setConfirmTransfer(false);
      setSelectedUids([]);
      const label = mode === 'praktikan' ? 'praktikan' : 'asprak';
      showToast(
        `${result.movedCount} ${label} dipindahkan dari ${result.sourceLabName} ke ${result.targetLabName}`,
        'success'
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal memindahkan anggota laboratorium.',
        'error'
      );
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  const handleConfirmReassign = async () => {
    if (!sourceLab || !selectedNextManager || busyRef.current) {
      return;
    }

    busyRef.current = true;
    setSubmitting(true);
    try {
      const result = await reassignLabManager({
        labId: sourceLab.id,
        nextAslabUid: selectedNextManager.uid,
      });
      setConfirmReassign(false);
      showToast(
        `Penanggung jawab ${result.labName} dialihkan ke ${selectedNextManager.name}`,
        'success'
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal mengalihkan penanggung jawab aslab.',
        'error'
      );
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DetailScreen title="Pindah Laboratorium">
        <View style={styles.fallback}>
          <LoadingState label="Memuat daftar laboratorium…" />
        </View>
      </DetailScreen>
    );
  }

  if (error) {
    return (
      <DetailScreen title="Pindah Laboratorium">
        <View style={styles.fallback}>
          <ErrorState message={error} onRetry={retry} />
        </View>
      </DetailScreen>
    );
  }

  if (labs.length < 2 || !sourceLab) {
    return (
      <DetailScreen title="Pindah Laboratorium">
        <View style={styles.fallback}>
          <EmptyState
            title="Minimal 2 laboratorium diperlukan"
            description="Tambahkan minimal dua laboratorium terlebih dahulu agar praktikan atau asprak dapat dipindahkan antar laboratorium."
            actionLabel="Tambah laboratorium"
            onAction={() => router.replace('/aslab/labs/form')}
          />
        </View>
      </DetailScreen>
    );
  }

  const roleLabel = mode === 'praktikan' ? 'praktikan' : 'asprak';
  const idLabel = mode === 'praktikan' ? 'NIM' : 'NIP';
  const sourceMissingCourse = !sourceLab.courseName.trim();
  const targetMissingCourse = Boolean(targetLab && !targetLab.courseName.trim());
  const canTransfer =
    Boolean(targetLab) &&
    activeSelectedUids.length > 0 &&
    !sourceMissingCourse &&
    !targetMissingCourse &&
    !submitting;

  const selectedNamesPreview = activeSelectedUids
    .slice(0, 3)
    .map((uid) => profilesByUid.get(uid)?.name || uid)
    .join(', ');
  const extraCount = Math.max(0, activeSelectedUids.length - 3);
  const transferSummaryNames =
    extraCount > 0 ? `${selectedNamesPreview}, +${extraCount} lainnya` : selectedNamesPreview;

  const currentManager = sourceLab.managedByAslabId
    ? profilesByUid.get(sourceLab.managedByAslabId)
    : undefined;

  return (
    <DetailScreen title="Pindah Laboratorium">
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
          refreshControl={
            <RefreshControl
              colors={[theme.primary]}
              onRefresh={() => {
                refresh();
                if (mode === 'asprak') {
                  setAslabAttempt((value) => value + 1);
                }
              }}
              refreshing={refreshing}
              tintColor={theme.textSecondary}
            />
          }>
          <View style={[styles.infoBanner, { backgroundColor: theme.surfaceSubtle }]}>
            <Text style={[styles.infoBannerText, { color: theme.textSecondary }]}>
              Perpindahan hanya memindahkan keanggotaan praktikan dan asprak/aslab antar
              laboratorium. Jadwal serta sesi praktikum di kedua laboratorium tetap utuh.
            </Text>
          </View>

          <SegmentedControl<TransferMemberKind>
            options={MODE_OPTIONS}
            value={mode}
            onChange={handleChangeMode}
          />

          <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              1. Pilih Laboratorium Asal
            </Text>
            <View style={styles.optionList}>
              {labs.map((lab) => {
                const selected = lab.id === sourceLab.id;
                const count =
                  mode === 'praktikan' ? lab.studentIds.length : lab.assistantIds.length;
                return (
                  <Pressable
                    key={lab.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => handleSelectSourceLab(lab.id)}
                    style={[
                      styles.labOption,
                      {
                        backgroundColor: selected
                          ? theme.primarySoft
                          : theme.surfaceSubtle,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}>
                    <View style={styles.rowBetween}>
                      <Text
                        numberOfLines={1}
                        style={[styles.optionTitle, { color: theme.textPrimary }]}>
                        {lab.nama}
                      </Text>
                      <Text style={[styles.optionCount, { color: theme.textSecondary }]}>
                        {count} {roleLabel}
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
            {sourceMissingCourse ? (
              <View style={[styles.warningBox, { backgroundColor: theme.warningSoft }]}>
                <Text style={[styles.warningText, { color: theme.warning }]}>
                  Mata kuliah laboratorium asal belum diisi. Lengkapi di menu Ubah
                  laboratorium terlebih dahulu.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                2. Pilih {mode === 'praktikan' ? 'Praktikan' : 'Asprak'} ({sourceMemberUids.length})
              </Text>
              {sourceMemberUids.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={handleToggleSelectAll}
                  style={styles.inlineLinkBtn}>
                  <Text style={[styles.inlineLink, { color: theme.link }]}>
                    {activeSelectedUids.length === sourceMemberUids.length
                      ? 'Batal pilih'
                      : 'Pilih semua'}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {sourceMemberUids.length === 0 ? (
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                Belum ada {roleLabel} terdaftar pada {sourceLab.nama}.
              </Text>
            ) : (
              <View style={styles.optionList}>
                {sourceMemberUids.map((uid) => {
                  const user = profilesByUid.get(uid);
                  const checked = activeSelectedUids.includes(uid);
                  return (
                    <Pressable
                      key={uid}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      onPress={() => toggleMember(uid)}
                      style={[
                        styles.memberRow,
                        {
                          backgroundColor: checked
                            ? theme.primarySoft
                            : theme.surfaceSubtle,
                          borderColor: checked ? theme.primary : theme.border,
                        },
                      ]}>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: checked ? theme.primary : theme.borderStrong,
                            backgroundColor: checked ? theme.primary : theme.surface,
                          },
                        ]}>
                        {checked ? (
                          <Text style={[styles.checkmark, { color: theme.onPrimary }]}>
                            ✓
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.memberInfo}>
                        <Text
                          numberOfLines={1}
                          style={[styles.optionTitle, { color: theme.textPrimary }]}>
                          {user?.name || (loadingProfiles ? 'Memuat profil…' : uid)}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[styles.meta, { color: theme.textSecondary }]}>
                          {user
                            ? `${idLabel} ${user.identifier} · ${user.email}`
                            : `UID: ${uid}`}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              3. Pilih Laboratorium Tujuan
            </Text>
            <View style={styles.optionList}>
              {targetCandidates.map((lab) => {
                const selected = lab.id === targetLab?.id;
                const count =
                  mode === 'praktikan' ? lab.studentIds.length : lab.assistantIds.length;
                return (
                  <Pressable
                    key={lab.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setTargetLabId(lab.id)}
                    style={[
                      styles.labOption,
                      {
                        backgroundColor: selected
                          ? theme.primarySoft
                          : theme.surfaceSubtle,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}>
                    <View style={styles.rowBetween}>
                      <Text
                        numberOfLines={1}
                        style={[styles.optionTitle, { color: theme.textPrimary }]}>
                        {lab.nama}
                      </Text>
                      <Text style={[styles.optionCount, { color: theme.textSecondary }]}>
                        {count} {roleLabel}
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
            {targetMissingCourse ? (
              <View style={[styles.warningBox, { backgroundColor: theme.warningSoft }]}>
                <Text style={[styles.warningText, { color: theme.warning }]}>
                  Mata kuliah laboratorium tujuan belum diisi. Lengkapi di menu Ubah
                  laboratorium terlebih dahulu.
                </Text>
              </View>
            ) : null}

            <AppButton
              label={
                activeSelectedUids.length > 0
                  ? `Pindahkan ${activeSelectedUids.length} ${roleLabel}`
                  : `Pilih ${roleLabel} untuk dipindahkan`
              }
              disabled={!canTransfer}
              loading={submitting}
              onPress={() => setConfirmTransfer(true)}
            />
          </View>

          {mode === 'asprak' ? (
            <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Alihkan Penanggung Jawab Aslab
              </Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                Penanggung jawab {sourceLab.nama} saat ini:{' '}
                {currentManager
                  ? `${currentManager.name} (${currentManager.identifier})`
                  : sourceLab.managedByAslabId || 'Belum diatur'}
              </Text>

              {loadingAslabs ? (
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  Memuat daftar akun aslab…
                </Text>
              ) : otherAslabCandidates.length === 0 ? (
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  Belum ada akun aslab lain yang terdaftar untuk pengalihan.
                </Text>
              ) : (
                <>
                  <View style={styles.optionList}>
                    {otherAslabCandidates.map((candidate) => {
                      const selected = candidate.uid === selectedNextManager?.uid;
                      return (
                        <Pressable
                          key={candidate.uid}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          onPress={() => setNextManagerUid(candidate.uid)}
                          style={[
                            styles.labOption,
                            {
                              backgroundColor: selected
                                ? theme.primarySoft
                                : theme.surfaceSubtle,
                              borderColor: selected ? theme.primary : theme.border,
                            },
                          ]}>
                          <Text
                            numberOfLines={1}
                            style={[styles.optionTitle, { color: theme.textPrimary }]}>
                            {candidate.name}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[styles.meta, { color: theme.textSecondary }]}>
                            NIP {candidate.identifier} · {candidate.email}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <AppButton
                    label="Alihkan penanggung jawab"
                    variant="secondary"
                    disabled={!selectedNextManager || sourceMissingCourse || submitting}
                    loading={submitting}
                    onPress={() => setConfirmReassign(true)}
                  />
                </>
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>

      <ConfirmModal
        visible={confirmTransfer}
        title={`Pindahkan ${activeSelectedUids.length} ${roleLabel}?`}
        message={
          targetLab
            ? `Pindahkan ${transferSummaryNames} dari "${sourceLab.nama}" ke "${targetLab.nama}"? Jadwal dan sesi praktikum di kedua laboratorium tidak dipindahkan.`
            : ''
        }
        confirmLabel={submitting ? 'Memindahkan…' : 'Pindahkan'}
        onCancel={() => {
          if (!submitting) {
            setConfirmTransfer(false);
          }
        }}
        onConfirm={() => {
          void handleConfirmTransfer();
        }}
      />

      <ConfirmModal
        visible={confirmReassign}
        title="Alihkan penanggung jawab Aslab?"
        message={
          selectedNextManager
            ? `Alihkan penanggung jawab "${sourceLab.nama}" ke ${selectedNextManager.name} (${selectedNextManager.email})? Jadwal praktikum tetap utuh.`
            : ''
        }
        confirmLabel={submitting ? 'Mengalihkan…' : 'Alihkan'}
        onCancel={() => {
          if (!submitting) {
            setConfirmReassign(false);
          }
        }}
        onConfirm={() => {
          void handleConfirmReassign();
        }}
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
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    maxWidth: 560,
    alignSelf: 'center',
    width: '100%',
  },
  infoBanner: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  infoBannerText: { ...Typography.caption },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: { ...Typography.cardTitle, flexShrink: 1 },
  meta: { ...Typography.caption },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  inlineLinkBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  inlineLink: { ...Typography.label },
  optionList: { gap: Spacing.two },
  labOption: {
    minHeight: 52,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: 2,
    justifyContent: 'center',
  },
  optionTitle: { ...Typography.bodyStrong, flex: 1, minWidth: 0 },
  optionCount: { ...Typography.caption },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.xs,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '700',
  },
  memberInfo: { flex: 1, minWidth: 0, gap: 2 },
  warningBox: {
    borderRadius: Radius.md,
    padding: Spacing.two,
  },
  warningText: { ...Typography.caption, fontWeight: '600' },
});
