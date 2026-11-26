import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import { AppTextField } from '@/components/ui/app-text-field';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  validateLabRowData,
  validateMemberRowData,
  type BulkRowForKind,
} from '@/lib/bulk-parser';
import type { BulkCommitSummary } from '@/services/bulkInsertService';
import type {
  BulkInsertKind,
  BulkLabRowData,
  BulkMemberRowData,
  BulkRowItem,
} from '@/types/attendance';

interface BulkReviewListProps<K extends BulkInsertKind> {
  kind: K;
  fileName: string;
  rows: BulkRowItem<BulkRowForKind<K>>[];
  validating: boolean;
  saving: boolean;
  contextReady: boolean;
  contextBlockedHint?: string;
  commitSummary?: BulkCommitSummary | null;
  onToggleDecision: (rowId: string, next: 'accepted' | 'denied') => void;
  onAcceptAllValid: () => void;
  onSaveRowEdit: (rowId: string | null, data: BulkRowForKind<K>) => void;
  onDeleteRow: (rowId: string) => void;
  onCommitAccepted: () => void;
}

type EditingTarget<K extends BulkInsertKind> =
  | { mode: 'create' }
  | { mode: 'edit'; row: BulkRowItem<BulkRowForKind<K>> };

function createEmptyDraft<K extends BulkInsertKind>(kind: K): BulkRowForKind<K> {
  if (kind === 'labs') {
    const emptyLab: BulkLabRowData = {
      nama: '',
      gedung: '',
      latitude: '',
      longitude: '',
      radius_meter: '50',
      grace_period_minutes: '15',
      late_fine_amount: '0',
    };
    return emptyLab as BulkRowForKind<K>;
  }
  const emptyMember: BulkMemberRowData = {
    identifier: '',
    email: '',
    nama: '',
  };
  return emptyMember as BulkRowForKind<K>;
}

function getRowErrors<K extends BulkInsertKind>(
  item: BulkRowItem<BulkRowForKind<K>>
): string[] {
  return Object.values(item.errors).filter((msg): msg is string => Boolean(msg));
}

interface BulkReviewCardProps<K extends BulkInsertKind> {
  kind: K;
  item: BulkRowItem<BulkRowForKind<K>>;
  busy: boolean;
  onToggleDecision: (rowId: string, next: 'accepted' | 'denied') => void;
  onEdit: (item: BulkRowItem<BulkRowForKind<K>>) => void;
  onDelete: (rowId: string) => void;
}

const BulkReviewCardInner = <K extends BulkInsertKind>({
  kind,
  item,
  busy,
  onToggleDecision,
  onEdit,
  onDelete,
}: BulkReviewCardProps<K>) => {
  const theme = useTheme();
  const errorMessages = getRowErrors(item);
  const hasErrors = errorMessages.length > 0;
  const isAccepted = item.decision === 'accepted';
  const isDenied = item.decision === 'denied';

  const statusConfig = hasErrors
    ? {
        label: 'Perlu Dilengkapi',
        bg: theme.warningSoft,
        fg: theme.warning,
      }
    : isAccepted
      ? {
          label: 'Diterima',
          bg: theme.successSoft,
          fg: theme.success,
        }
      : isDenied
        ? {
            label: 'Ditolak',
            bg: theme.errorSoft,
            fg: theme.error,
          }
        : {
            label: 'Menunggu Review',
            bg: theme.surfaceSubtle,
            fg: theme.textSecondary,
          };

  const renderDetails = () => {
    if (kind === 'labs') {
      const data = item.data as BulkLabRowData;
      return (
        <>
          <Text
            numberOfLines={2}
            style={[
              styles.rowTitle,
              { color: data.nama ? theme.textPrimary : theme.error },
            ]}>
            {data.nama || '(Nama lab kosong)'}
          </Text>
          <View style={styles.fieldGrid}>
            <FieldBadge label="Gedung" value={data.gedung || '—'} />
            <FieldBadge
              label="Lat / Lng"
              value={
                data.latitude && data.longitude
                  ? `${data.latitude}, ${data.longitude}`
                  : 'Belum lengkap'
              }
              missing={!data.latitude || !data.longitude}
            />
            <FieldBadge
              label="Radius"
              value={data.radius_meter ? `${data.radius_meter} m` : 'Kosong'}
              missing={!data.radius_meter}
            />
            <FieldBadge
              label="Toleransi"
              value={
                data.grace_period_minutes
                  ? `${data.grace_period_minutes} mnt`
                  : 'Kosong'
              }
              missing={!data.grace_period_minutes}
            />
            <FieldBadge
              label="Denda"
              value={
                data.late_fine_amount ? `Rp ${data.late_fine_amount}` : 'Kosong'
              }
              missing={!data.late_fine_amount}
            />
          </View>
        </>
      );
    }

    const data = item.data as BulkMemberRowData;
    const idLabel = kind === 'praktikan' ? 'NIM' : 'NIP';
    return (
      <>
        <Text
          numberOfLines={2}
          style={[styles.rowTitle, { color: theme.textPrimary }]}>
          {data.nama || item.statusNote || '(Tanpa label nama)'}
        </Text>
        <View style={styles.fieldGrid}>
          <FieldBadge
            label={idLabel}
            value={data.identifier || 'Kosong'}
            missing={!data.identifier && !data.email}
          />
          <FieldBadge
            label="Email"
            value={data.email || 'Kosong'}
            missing={!data.identifier && !data.email}
          />
        </View>
        {item.statusNote && !hasErrors ? (
          <Text style={[styles.matchText, { color: theme.success }]}>
            {item.statusNote}
          </Text>
        ) : null}
      </>
    );
  };

  return (
    <View
      style={[
        styles.rowCard,
        {
          backgroundColor: isDenied ? theme.surfaceSubtle : theme.surface,
          borderColor: hasErrors
            ? theme.warning
            : isAccepted
              ? theme.success
              : isDenied
                ? theme.border
                : theme.border,
          opacity: isDenied ? 0.78 : 1,
        },
      ]}>
      <View style={styles.rowHeader}>
        <Text style={[styles.rowNumber, { color: theme.textSecondary }]}>
          Baris #{item.rowNumber}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Text style={[styles.statusText, { color: statusConfig.fg }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {renderDetails()}

      {hasErrors ? (
        <View style={[styles.errorBox, { backgroundColor: theme.errorSoft }]}>
          {errorMessages.map((msg, idx) => (
            <Text key={`${item.rowId}-err-${idx}`} style={[styles.errorText, { color: theme.error }]}>
              • {msg}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.rowActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Terima baris ${item.rowNumber}`}
          accessibilityState={{ disabled: hasErrors || busy, selected: isAccepted }}
          disabled={hasErrors || busy}
          onPress={() => onToggleDecision(item.rowId, 'accepted')}
          style={({ pressed }) => [
            styles.rowActionBtn,
            {
              backgroundColor:
                hasErrors
                  ? theme.disabledBg
                  : isAccepted
                    ? theme.success
                    : theme.surfaceSubtle,
              borderColor:
                hasErrors
                  ? theme.border
                  : isAccepted
                    ? theme.success
                    : theme.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <Text
            style={[
              styles.rowActionText,
              {
                color: hasErrors
                  ? theme.disabledText
                  : isAccepted
                    ? theme.onPrimary
                    : theme.textPrimary,
              },
            ]}>
            {isAccepted ? 'Diterima ✓' : 'Accept'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tolak baris ${item.rowNumber}`}
          accessibilityState={{ disabled: busy, selected: isDenied }}
          disabled={busy}
          onPress={() => onToggleDecision(item.rowId, 'denied')}
          style={({ pressed }) => [
            styles.rowActionBtn,
            {
              backgroundColor: isDenied ? theme.error : theme.surfaceSubtle,
              borderColor: isDenied ? theme.error : theme.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <Text
            style={[
              styles.rowActionText,
              { color: isDenied ? theme.onPrimary : theme.error },
            ]}>
            {isDenied ? 'Ditolak ✕' : 'Deny'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit baris ${item.rowNumber}`}
          disabled={busy}
          onPress={() => onEdit(item)}
          style={({ pressed }) => [
            styles.rowActionBtn,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <Text style={[styles.rowActionText, { color: theme.primary }]}>
            Edit
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Hapus baris ${item.rowNumber}`}
          disabled={busy}
          onPress={() => onDelete(item.rowId)}
          style={({ pressed }) => [
            styles.rowActionBtn,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <Text style={[styles.rowActionText, { color: theme.textSecondary }]}>
            Hapus
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const BulkReviewCard = memo(BulkReviewCardInner) as typeof BulkReviewCardInner;

function FieldBadge({
  label,
  value,
  missing = false,
}: {
  label: string;
  value: string;
  missing?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.fieldChip,
        {
          backgroundColor: missing ? theme.warningSoft : theme.surfaceSubtle,
        },
      ]}>
      <Text style={[styles.fieldChipLabel, { color: theme.textSecondary }]}>
        {label}:{' '}
        <Text
          style={{
            color: missing ? theme.warning : theme.textPrimary,
            fontWeight: '600',
          }}>
          {value}
        </Text>
      </Text>
    </View>
  );
}

export function BulkReviewList<K extends BulkInsertKind>({
  kind,
  fileName,
  rows,
  validating,
  saving,
  contextReady,
  contextBlockedHint,
  commitSummary,
  onToggleDecision,
  onAcceptAllValid,
  onSaveRowEdit,
  onDeleteRow,
  onCommitAccepted,
}: BulkReviewListProps<K>) {
  const theme = useTheme();
  const [editingTarget, setEditingTarget] = useState<EditingTarget<K> | null>(
    null
  );

  const summary = useMemo(() => {
    let accepted = 0;
    let denied = 0;
    let invalid = 0;
    let validPending = 0;
    let acceptedInvalid = 0;

    for (const row of rows) {
      const hasErrors = getRowErrors(row).length > 0;
      if (hasErrors) invalid += 1;
      if (row.decision === 'accepted') {
        accepted += 1;
        if (hasErrors) acceptedInvalid += 1;
      } else if (row.decision === 'denied') {
        denied += 1;
      } else if (!hasErrors) {
        validPending += 1;
      }
    }

    return {
      total: rows.length,
      accepted,
      denied,
      invalid,
      validPending,
      acceptedInvalid,
    };
  }, [rows]);

  const handleOpenEdit = useCallback((item: BulkRowItem<BulkRowForKind<K>>) => {
    setEditingTarget({ mode: 'edit', row: item });
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditingTarget(null);
  }, []);

  const canSaveBatch =
    !validating &&
    !saving &&
    contextReady &&
    summary.accepted > 0 &&
    summary.acceptedInvalid === 0;

  return (
    <View style={styles.container}>
      <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Review Staging ({summary.total} baris)
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          Sumber: {fileName}
        </Text>

        <View style={styles.statsGrid}>
          <StatPill
            label="Total"
            value={summary.total}
            bg={theme.surfaceSubtle}
            fg={theme.textPrimary}
          />
          <StatPill
            label="Diterima"
            value={summary.accepted}
            bg={theme.successSoft}
            fg={theme.success}
          />
          <StatPill
            label="Ditolak"
            value={summary.denied}
            bg={theme.errorSoft}
            fg={theme.error}
          />
          <StatPill
            label="Perlu Dilengkapi"
            value={summary.invalid}
            bg={summary.invalid > 0 ? theme.warningSoft : theme.surfaceSubtle}
            fg={summary.invalid > 0 ? theme.warning : theme.textSecondary}
          />
        </View>

        {validating ? (
          <View style={[styles.banner, { backgroundColor: theme.surfaceSubtle }]}>
            <Text style={[styles.bannerText, { color: theme.textSecondary }]}>
              Memvalidasi baris dengan data Firebase…
            </Text>
          </View>
        ) : null}

        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            disabled={validating || saving || summary.validPending === 0}
            onPress={onAcceptAllValid}
            style={({ pressed }) => [
              styles.toolbarBtn,
              {
                backgroundColor:
                  validating || saving || summary.validPending === 0
                    ? theme.disabledBg
                    : theme.primarySoft,
                borderColor:
                  validating || saving || summary.validPending === 0
                    ? theme.border
                    : theme.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Text
              style={[
                styles.toolbarBtnText,
                {
                  color:
                    validating || saving || summary.validPending === 0
                      ? theme.disabledText
                      : theme.primary,
                },
              ]}>
              Terima semua yang valid ({summary.validPending})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={validating || saving}
            onPress={() => setEditingTarget({ mode: 'create' })}
            style={({ pressed }) => [
              styles.toolbarBtn,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <Text style={[styles.toolbarBtnText, { color: theme.textPrimary }]}>
              + Tambah baris
            </Text>
          </Pressable>
        </View>
      </View>

      {rows.length === 0 ? (
        <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            Semua baris telah diproses atau dihapus. Anda bisa menambah baris manual
            atau memilih file CSV lain.
          </Text>
        </View>
      ) : (
        <ScrollView
          nestedScrollEnabled
          style={[styles.listScroll, { borderColor: theme.border }]}
          contentContainerStyle={styles.listContent}>
          {rows.map((row) => (
            <BulkReviewCard
              key={row.rowId}
              kind={kind}
              item={row}
              busy={validating || saving}
              onToggleDecision={onToggleDecision}
              onEdit={handleOpenEdit}
              onDelete={onDeleteRow}
            />
          ))}
        </ScrollView>
      )}

      {commitSummary ? (
        <View
          style={[
            styles.card,
            Shadow.soft,
            {
              backgroundColor:
                commitSummary.failedCount > 0 ? theme.errorSoft : theme.successSoft,
            },
          ]}>
          <Text
            style={[
              styles.cardTitle,
              {
                color:
                  commitSummary.failedCount > 0 ? theme.error : theme.success,
              },
            ]}>
            Ringkasan Simpan Batch
          </Text>
          <Text style={[styles.meta, { color: theme.textPrimary }]}>
            Tersimpan: {commitSummary.savedCount} · Diabaikan (Ditolak/Menunggu):{' '}
            {commitSummary.skippedCount} · Gagal: {commitSummary.failedCount}
          </Text>
          {commitSummary.errorMessages.map((msg, idx) => (
            <Text key={`sum-err-${idx}`} style={[styles.errorText, { color: theme.error }]}>
              • {msg}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
        {!contextReady && contextBlockedHint ? (
          <Text style={[styles.meta, { color: theme.warning }]}>
            {contextBlockedHint}
          </Text>
        ) : summary.accepted === 0 ? (
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            Tandai minimal satu baris valid sebagai Accept untuk menyimpan ke
            Firestore. Baris Deny akan diabaikan.
          </Text>
        ) : null}

        <AppButton
          label={
            saving
              ? 'Menyimpan ke Firestore…'
              : `Simpan Data Diterima (${summary.accepted})`
          }
          disabled={!canSaveBatch}
          loading={saving}
          onPress={onCommitAccepted}
        />
      </View>

      {editingTarget ? (
        <BulkRowEditModal
          kind={kind}
          target={editingTarget}
          onClose={handleCloseModal}
          onSave={(data) => {
            onSaveRowEdit(
              editingTarget.mode === 'edit' ? editingTarget.row.rowId : null,
              data
            );
            handleCloseModal();
          }}
        />
      ) : null}
    </View>
  );
}

function StatPill({
  label,
  value,
  bg,
  fg,
}: {
  label: string;
  value: number;
  bg: string;
  fg: string;
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color: fg }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

function BulkRowEditModal<K extends BulkInsertKind>({
  kind,
  target,
  onClose,
  onSave,
}: {
  kind: K;
  target: EditingTarget<K>;
  onClose: () => void;
  onSave: (data: BulkRowForKind<K>) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const initial =
    target.mode === 'edit' ? target.row.data : createEmptyDraft(kind);

  const [labDraft, setLabDraft] = useState<BulkLabRowData>(
    kind === 'labs'
      ? { ...(initial as BulkLabRowData) }
      : (createEmptyDraft('labs') as BulkLabRowData)
  );
  const [memberDraft, setMemberDraft] = useState<BulkMemberRowData>(
    kind === 'labs'
      ? (createEmptyDraft('praktikan') as BulkMemberRowData)
      : { ...(initial as BulkMemberRowData) }
  );

  const labErrors = useMemo(
    () => (kind === 'labs' ? validateLabRowData(labDraft) : {}),
    [kind, labDraft]
  );
  const memberErrors = useMemo(
    () =>
      kind === 'labs'
        ? {}
        : validateMemberRowData(kind as 'praktikan' | 'asprak', memberDraft),
    [kind, memberDraft]
  );

  const coordKeyboardType =
    Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';
  const title =
    target.mode === 'edit'
      ? `Edit Baris #${target.row.rowNumber}`
      : 'Tambah Baris Baru';

  const handleConfirm = () => {
    if (kind === 'labs') {
      onSave({
        nama: labDraft.nama.trim(),
        gedung: labDraft.gedung.trim(),
        latitude: labDraft.latitude.trim(),
        longitude: labDraft.longitude.trim(),
        radius_meter: labDraft.radius_meter.trim(),
        grace_period_minutes: labDraft.grace_period_minutes.trim(),
        late_fine_amount: labDraft.late_fine_amount.trim(),
      } as BulkRowForKind<K>);
      return;
    }

    onSave({
      identifier: memberDraft.identifier.trim(),
      email: memberDraft.email.trim().toLowerCase(),
      nama: memberDraft.nama.trim(),
    } as BulkRowForKind<K>);
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <Pressable
          accessibilityLabel="Tutup edit baris"
          onPress={onClose}
          style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.modalSheet,
            Shadow.sheet,
            {
              backgroundColor: theme.background,
              paddingBottom: Math.max(insets.bottom, Spacing.three),
            },
          ]}>
          <View style={[styles.modalHandle, { backgroundColor: theme.borderStrong }]} />
          <View style={styles.modalHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {title}
            </Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              Lengkapi atau perbaiki data baris sebelum disetujui.
            </Text>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalFields}
            keyboardShouldPersistTaps="handled">
            {kind === 'labs' ? (
              <>
                <AppTextField
                  label="Nama laboratorium"
                  value={labDraft.nama}
                  onChangeText={(val) => setLabDraft((c) => ({ ...c, nama: val }))}
                  error={labErrors.nama}
                  maxLength={100}
                  required
                />
                <AppTextField
                  label="Gedung / lokasi"
                  value={labDraft.gedung}
                  onChangeText={(val) => setLabDraft((c) => ({ ...c, gedung: val }))}
                  error={labErrors.gedung}
                  maxLength={100}
                />
                <AppTextField
                  label="Latitude"
                  value={labDraft.latitude}
                  onChangeText={(val) =>
                    setLabDraft((c) => ({ ...c, latitude: val }))
                  }
                  error={labErrors.latitude}
                  keyboardType={coordKeyboardType}
                  autoCorrect={false}
                  required
                />
                <AppTextField
                  label="Longitude"
                  value={labDraft.longitude}
                  onChangeText={(val) =>
                    setLabDraft((c) => ({ ...c, longitude: val }))
                  }
                  error={labErrors.longitude}
                  keyboardType={coordKeyboardType}
                  autoCorrect={false}
                  required
                />
                <AppTextField
                  label="Radius presensi (meter)"
                  value={labDraft.radius_meter}
                  onChangeText={(val) =>
                    setLabDraft((c) => ({ ...c, radius_meter: val }))
                  }
                  error={labErrors.radius_meter}
                  keyboardType={coordKeyboardType}
                  autoCorrect={false}
                  required
                />
                <AppTextField
                  label="Grace period (menit)"
                  value={labDraft.grace_period_minutes}
                  onChangeText={(val) =>
                    setLabDraft((c) => ({ ...c, grace_period_minutes: val }))
                  }
                  error={labErrors.grace_period_minutes}
                  keyboardType="number-pad"
                  autoCorrect={false}
                  required
                />
                <AppTextField
                  label="Nominal denda (Rp)"
                  value={labDraft.late_fine_amount}
                  onChangeText={(val) =>
                    setLabDraft((c) => ({ ...c, late_fine_amount: val }))
                  }
                  error={labErrors.late_fine_amount}
                  keyboardType="number-pad"
                  autoCorrect={false}
                  required
                />
              </>
            ) : (
              <>
                <AppTextField
                  label={kind === 'praktikan' ? 'NIM' : 'NIP'}
                  placeholder="Contoh: 2211102034"
                  value={memberDraft.identifier}
                  onChangeText={(val) =>
                    setMemberDraft((c) => ({ ...c, identifier: val }))
                  }
                  error={memberErrors.identifier}
                  keyboardType="number-pad"
                  autoCorrect={false}
                />
                <AppTextField
                  label="Email"
                  placeholder="nama@contoh.com"
                  value={memberDraft.email}
                  onChangeText={(val) =>
                    setMemberDraft((c) => ({ ...c, email: val }))
                  }
                  error={memberErrors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AppTextField
                  label="Nama (opsional)"
                  placeholder="Nama lengkap"
                  value={memberDraft.nama}
                  onChangeText={(val) =>
                    setMemberDraft((c) => ({ ...c, nama: val }))
                  }
                  error={memberErrors.nama}
                  maxLength={60}
                />
              </>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <View style={styles.modalFooterBtn}>
              <AppButton label="Batal" variant="secondary" onPress={onClose} />
            </View>
            <View style={styles.modalFooterBtn}>
              <AppButton label="Simpan baris" onPress={handleConfirm} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: { ...Typography.sectionTitle },
  cardTitle: { ...Typography.cardTitle },
  meta: { ...Typography.caption },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statPill: {
    flex: 1,
    minWidth: 72,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    alignItems: 'center',
  },
  statValue: { ...Typography.cardTitle, fontVariant: ['tabular-nums'] },
  statLabel: { ...Typography.caption, textAlign: 'center' },
  banner: {
    borderRadius: Radius.md,
    padding: Spacing.two,
  },
  bannerText: { ...Typography.caption },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  toolbarBtn: {
    flex: 1,
    minWidth: 130,
    minHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarBtnText: { ...Typography.label, textAlign: 'center' },
  listScroll: {
    maxHeight: 480,
    borderWidth: 1,
    borderRadius: Radius.card,
  },
  listContent: {
    padding: Spacing.two,
    gap: Spacing.two,
  },
  rowCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowNumber: { ...Typography.caption, fontWeight: '600' },
  statusBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  statusText: { ...Typography.caption, fontWeight: '700' },
  rowTitle: { ...Typography.bodyStrong },
  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  fieldChip: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  fieldChipLabel: { ...Typography.caption },
  matchText: { ...Typography.caption, fontWeight: '600' },
  errorBox: {
    borderRadius: Radius.md,
    padding: Spacing.two,
    gap: 2,
  },
  errorText: { ...Typography.caption },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  rowActionBtn: {
    flex: 1,
    minWidth: 72,
    minHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActionText: { ...Typography.caption, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '88%',
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: Radius.full,
  },
  modalHeader: { gap: 2 },
  modalScroll: { flexGrow: 0 },
  modalFields: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  modalFooter: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modalFooterBtn: { flex: 1 },
});
