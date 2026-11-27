import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BulkReviewList } from '@/components/aslab/bulk-review-list';
import { AppButton } from '@/components/ui/app-button';
import { useToast } from '@/components/ui/toast-provider';
import { Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  pickAndParseBulkCsv,
  type BulkRowForKind,
} from '@/lib/bulk-parser';
import {
  BULK_TEMPLATE_COLUMNS,
  downloadBulkTemplate,
  getBulkTemplateSpec,
} from '@/lib/bulk-templates';
import {
  commitBulkLabs,
  commitBulkMembers,
  createMemberLookupCache,
  validateBulkLabRows,
  validateBulkMemberRows,
  type BulkCommitSummary,
  type MemberLookupCache,
} from '@/services/bulkInsertService';
import type {
  BulkInsertKind,
  BulkLabRowData,
  BulkMemberRowData,
  BulkParseResult,
  BulkRowItem,
  Laboratory,
} from '@/types/attendance';

interface BulkCsvPanelProps<K extends BulkInsertKind> {
  kind: K;
  contextReady: boolean;
  contextLabel: string;
  contextBlockedHint: string;
  parseResult: BulkParseResult<BulkRowForKind<K>> | null;
  onParsed: (result: BulkParseResult<BulkRowForKind<K>> | null) => void;
  courseName?: string;
  existingLabs?: Laboratory[];
  targetLab?: Laboratory | null;
  managedByAslabId?: string;
}

export function BulkCsvPanel<K extends BulkInsertKind>({
  kind,
  contextReady,
  contextLabel,
  contextBlockedHint,
  parseResult,
  onParsed,
  courseName,
  existingLabs,
  targetLab,
  managedByAslabId,
}: BulkCsvPanelProps<K>) {
  const theme = useTheme();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [picking, setPicking] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stagingRows, setStagingRows] = useState<
    BulkRowItem<BulkRowForKind<K>>[]
  >([]);
  const [commitSummary, setCommitSummary] = useState<BulkCommitSummary | null>(
    null
  );

  const stagingRowsRef = useRef<BulkRowItem<BulkRowForKind<K>>[]>([]);
  const memberLookupCacheRef = useRef<MemberLookupCache | null>(null);
  const validationRunRef = useRef(0);
  const manualCounterRef = useRef(1);
  const savingRef = useRef(false);

  const spec = getBulkTemplateSpec(kind);
  const columns = BULK_TEMPLATE_COLUMNS[kind];

  const runValidation = useCallback(
    async (candidateRows: BulkRowItem<BulkRowForKind<K>>[]) => {
      const currentRun = ++validationRunRef.current;

      if (kind === 'labs') {
        const validated = validateBulkLabRows(
          candidateRows as BulkRowItem<BulkLabRowData>[],
          courseName ?? '',
          existingLabs ?? []
        ) as BulkRowItem<BulkRowForKind<K>>[];
        if (validationRunRef.current === currentRun) {
          stagingRowsRef.current = validated;
          setStagingRows(validated);
        }
        return;
      }

      if (!targetLab) {
        return;
      }

      const memberKind = kind as 'praktikan' | 'asprak';
      if (
        !memberLookupCacheRef.current ||
        memberLookupCacheRef.current.roleKey !== memberKind
      ) {
        memberLookupCacheRef.current = createMemberLookupCache(memberKind);
      }

      const cache = memberLookupCacheRef.current;
      const needsNetworkLookup = (
        candidateRows as BulkRowItem<BulkMemberRowData>[]
      ).some((row) => {
        const email = row.data.email.trim().toLowerCase();
        const identifier = row.data.identifier.trim();
        return (
          (email.length > 0 && !cache.targetByEmail.has(email)) ||
          (identifier.length > 0 && !cache.targetById.has(identifier))
        );
      });

      if (needsNetworkLookup) {
        setValidating(true);
      }
      try {
        const validated = (await validateBulkMemberRows(
          memberKind,
          candidateRows as BulkRowItem<BulkMemberRowData>[],
          targetLab,
          cache
        )) as BulkRowItem<BulkRowForKind<K>>[];
        if (validationRunRef.current === currentRun) {
          stagingRowsRef.current = validated;
          setStagingRows(validated);
        }
      } catch (err) {
        if (validationRunRef.current === currentRun) {
          showToast(
            err instanceof Error
              ? err.message
              : 'Gagal memvalidasi baris staging.',
            'error'
          );
          stagingRowsRef.current = candidateRows;
          setStagingRows(candidateRows);
        }
      } finally {
        if (validationRunRef.current === currentRun) {
          setValidating(false);
        }
      }
    },
    [kind, courseName, existingLabs, targetLab, showToast]
  );

  useEffect(() => {
    if (!parseResult || !parseResult.ok || stagingRowsRef.current.length === 0) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled && !savingRef.current) {
        void runValidation(stagingRowsRef.current);
      }
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [parseResult, runValidation]);

  const handleDownloadTemplate = async () => {
    if (downloading) {
      return;
    }
    setDownloading(true);
    try {
      const { filename } = await downloadBulkTemplate(kind);
      showToast(`Template ${filename} siap`, 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal mengunduh template CSV.',
        'error'
      );
    } finally {
      setDownloading(false);
    }
  };

  const handlePickFile = async () => {
    if (picking || saving || !contextReady) {
      return;
    }
    setPicking(true);
    try {
      const outcome = await pickAndParseBulkCsv(kind);
      if (outcome.canceled) {
        return;
      }
      setCommitSummary(null);
      memberLookupCacheRef.current = null;
      if (outcome.result.ok) {
        stagingRowsRef.current = outcome.result.rows;
        setStagingRows(outcome.result.rows);
        onParsed(outcome.result);
        showToast(
          `${outcome.result.rows.length} baris berhasil dibaca dari ${outcome.result.fileName}`,
          'success'
        );
      } else {
        stagingRowsRef.current = [];
        setStagingRows([]);
        onParsed(outcome.result);
      }
    } catch (err) {
      stagingRowsRef.current = [];
      setStagingRows([]);
      setCommitSummary(null);
      onParsed({
        ok: false,
        error:
          err instanceof Error ? err.message : 'Gagal memproses file CSV.',
        expectedColumns: [...columns],
      });
    } finally {
      setPicking(false);
    }
  };

  const handleReset = () => {
    validationRunRef.current += 1;
    memberLookupCacheRef.current = null;
    stagingRowsRef.current = [];
    setStagingRows([]);
    setCommitSummary(null);
    setValidating(false);
    onParsed(null);
  };

  const handleToggleDecision = useCallback(
    (rowId: string, next: 'accepted' | 'denied') => {
      const updated = stagingRowsRef.current.map((row) => {
        if (row.rowId !== rowId) {
          return row;
        }
        const hasErrors = Object.values(row.errors).some((msg) => Boolean(msg));
        if (next === 'accepted' && hasErrors) {
          return row;
        }
        return {
          ...row,
          decision: row.decision === next ? ('pending' as const) : next,
        };
      });
      stagingRowsRef.current = updated;
      setCommitSummary(null);
      void runValidation(updated);
    },
    [runValidation]
  );

  const handleAcceptAllValid = useCallback(() => {
    const updated = stagingRowsRef.current.map((row) => {
      const hasErrors = Object.values(row.errors).some((msg) => Boolean(msg));
      if (hasErrors || row.decision === 'denied') {
        return row;
      }
      return {
        ...row,
        decision: 'accepted' as const,
      };
    });
    stagingRowsRef.current = updated;
    setCommitSummary(null);
    void runValidation(updated);
  }, [runValidation]);

  const handleSaveRowEdit = useCallback(
    (rowId: string | null, data: BulkRowForKind<K>) => {
      let updated: BulkRowItem<BulkRowForKind<K>>[];
      if (rowId === null) {
        const nextRowNum =
          stagingRowsRef.current.reduce(
            (max, item) => Math.max(max, item.rowNumber),
            1
          ) + 1;
        const newId = `manual-${kind}-${manualCounterRef.current++}`;
        const newRow: BulkRowItem<BulkRowForKind<K>> = {
          rowId: newId,
          rowNumber: nextRowNum,
          data,
          decision: 'pending',
          errors: {},
        };
        updated = [...stagingRowsRef.current, newRow];
      } else {
        updated = stagingRowsRef.current.map((row) =>
          row.rowId === rowId ? { ...row, data } : row
        );
      }

      stagingRowsRef.current = updated;
      setCommitSummary(null);
      void runValidation(updated);
    },
    [kind, runValidation]
  );

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      const updated = stagingRowsRef.current.filter((row) => row.rowId !== rowId);
      stagingRowsRef.current = updated;
      setCommitSummary(null);
      if (updated.length === 0) {
        setStagingRows([]);
        return;
      }
      void runValidation(updated);
    },
    [runValidation]
  );

  const handleCommitAccepted = async () => {
    if (savingRef.current || validating || !contextReady) {
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const summary =
        kind === 'labs'
          ? await commitBulkLabs({
              courseName: courseName ?? '',
              rows: stagingRowsRef.current as BulkRowItem<BulkLabRowData>[],
              managedByAslabId,
            })
          : await commitBulkMembers({
              kind: kind as 'praktikan' | 'asprak',
              labId: targetLab?.id ?? '',
              rows: stagingRowsRef.current as BulkRowItem<BulkMemberRowData>[],
            });

      setCommitSummary(summary);
      if (summary.savedRowIds.length > 0) {
        const savedSet = new Set(summary.savedRowIds);
        const remaining = stagingRowsRef.current.filter(
          (row) => !savedSet.has(row.rowId)
        );
        stagingRowsRef.current = remaining;
        setStagingRows(remaining);
      }

      if (summary.savedCount > 0 && summary.failedCount === 0) {
        showToast(
          `${summary.savedCount} data berhasil disimpan ke Firestore`,
          'success'
        );
      } else if (summary.savedCount > 0) {
        showToast(
          `${summary.savedCount} tersimpan, ${summary.failedCount} gagal`,
          'error'
        );
      } else if (summary.errorMessages.length > 0) {
        showToast(summary.errorMessages[0], 'error');
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Gagal menyimpan data batch.',
        'error'
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={styles.stack}>
      <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
          1. Unduh Template CSV
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          File: {spec.filename}
        </Text>
        <View style={[styles.columnsBox, { backgroundColor: theme.surfaceSubtle }]}>
          <Text style={[styles.columnsLabel, { color: theme.textSecondary }]}>
            Kolom wajib:
          </Text>
          <Text style={[styles.columnsValue, { color: theme.textPrimary }]}>
            {columns.join(', ')}
          </Text>
        </View>
        <AppButton
          label={downloading ? 'Menyiapkan template…' : 'Unduh Template (.csv)'}
          variant="secondary"
          loading={downloading}
          disabled={saving}
          onPress={handleDownloadTemplate}
        />
      </View>

      <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
          2. Upload File CSV
        </Text>
        <Text
          style={[
            styles.meta,
            { color: contextReady ? theme.textSecondary : theme.warning },
          ]}>
          {contextReady ? contextLabel : contextBlockedHint}
        </Text>
        <AppButton
          label={picking ? 'Membaca file…' : 'Pilih File CSV'}
          disabled={!contextReady || picking || saving}
          loading={picking}
          onPress={handlePickFile}
        />
        {parseResult ? (
          <AppButton
            label="Reset hasil baca"
            variant="secondary"
            disabled={picking || saving}
            onPress={handleReset}
          />
        ) : null}
      </View>

      {parseResult && !parseResult.ok ? (
        <View
          style={[
            styles.alertPanel,
            { backgroundColor: theme.errorSoft, borderColor: theme.error },
          ]}>
          <Text style={[styles.alertTitle, { color: theme.error }]}>
            File CSV Tidak Valid
          </Text>
          <Text style={[styles.alertBody, { color: theme.error }]}>
            {parseResult.error}
          </Text>
          <Text style={[styles.alertHint, { color: theme.textSecondary }]}>
            Kolom yang dibutuhkan: {parseResult.expectedColumns.join(', ')}
          </Text>
        </View>
      ) : null}

      {parseResult && parseResult.ok ? (
        <BulkReviewList
          kind={kind}
          fileName={parseResult.fileName}
          rows={stagingRows}
          validating={validating}
          saving={saving}
          contextReady={contextReady}
          contextBlockedHint={contextBlockedHint}
          commitSummary={commitSummary}
          onToggleDecision={handleToggleDecision}
          onAcceptAllValid={handleAcceptAllValid}
          onSaveRowEdit={handleSaveRowEdit}
          onDeleteRow={handleDeleteRow}
          onCommitAccepted={handleCommitAccepted}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.three },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardTitle: { ...Typography.cardTitle },
  meta: { ...Typography.caption },
  columnsBox: {
    borderRadius: Radius.md,
    padding: Spacing.two,
    gap: 2,
  },
  columnsLabel: { ...Typography.caption },
  columnsValue: { ...Typography.label },
  alertPanel: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  alertTitle: { ...Typography.cardTitle },
  alertBody: { ...Typography.body },
  alertHint: { ...Typography.caption },
});
