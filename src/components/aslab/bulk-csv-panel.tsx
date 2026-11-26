import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
import type {
  BulkInsertKind,
  BulkLabRowData,
  BulkMemberRowData,
  BulkParseResult,
  BulkRowItem,
} from '@/types/attendance';

interface BulkCsvPanelProps<K extends BulkInsertKind> {
  kind: K;
  contextReady: boolean;
  contextLabel: string;
  contextBlockedHint: string;
  parseResult: BulkParseResult<BulkRowForKind<K>> | null;
  onParsed: (result: BulkParseResult<BulkRowForKind<K>> | null) => void;
}

const MAX_PREVIEW_ROWS = 20;

function formatRowTitle<K extends BulkInsertKind>(
  kind: K,
  item: BulkRowItem<BulkRowForKind<K>>
): string {
  if (kind === 'labs') {
    const data = item.data as BulkLabRowData;
    return data.nama || '(Nama lab kosong)';
  }
  const data = item.data as BulkMemberRowData;
  return data.nama || data.identifier || data.email || '(Data kosong)';
}

function formatRowMeta<K extends BulkInsertKind>(
  kind: K,
  item: BulkRowItem<BulkRowForKind<K>>
): string {
  if (kind === 'labs') {
    const data = item.data as BulkLabRowData;
    const parts = [
      data.gedung || 'Tanpa gedung',
      `Lat ${data.latitude || '—'}, Lng ${data.longitude || '—'}`,
      `Radius ${data.radius_meter || '—'} m`,
      `Toleransi ${data.grace_period_minutes || '—'} mnt`,
      `Denda Rp ${data.late_fine_amount || '—'}`,
    ];
    return parts.join(' · ');
  }
  const data = item.data as BulkMemberRowData;
  const idLabel = kind === 'praktikan' ? 'NIM' : 'NIP';
  return `${idLabel}: ${data.identifier || '—'} · Email: ${data.email || '—'}`;
}

export function BulkCsvPanel<K extends BulkInsertKind>({
  kind,
  contextReady,
  contextLabel,
  contextBlockedHint,
  parseResult,
  onParsed,
}: BulkCsvPanelProps<K>) {
  const theme = useTheme();
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [picking, setPicking] = useState(false);

  const spec = getBulkTemplateSpec(kind);
  const columns = BULK_TEMPLATE_COLUMNS[kind];

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
    if (picking || !contextReady) {
      return;
    }
    setPicking(true);
    try {
      const outcome = await pickAndParseBulkCsv(kind);
      if (outcome.canceled) {
        return;
      }
      onParsed(outcome.result);
      if (outcome.result.ok) {
        showToast(
          `${outcome.result.rows.length} baris berhasil dibaca dari ${outcome.result.fileName}`,
          'success'
        );
      }
    } catch (err) {
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

  const validCount =
    parseResult && parseResult.ok
      ? parseResult.rows.filter((row) => Object.keys(row.errors).length === 0).length
      : 0;
  const invalidCount =
    parseResult && parseResult.ok ? parseResult.rows.length - validCount : 0;

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
          disabled={!contextReady || picking}
          loading={picking}
          onPress={handlePickFile}
        />
        {parseResult ? (
          <AppButton
            label="Reset hasil baca"
            variant="secondary"
            disabled={picking}
            onPress={() => onParsed(null)}
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
        <View style={[styles.card, Shadow.soft, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Pratinjau Hasil Parsing ({parseResult.rows.length} baris)
          </Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            File: {parseResult.fileName}
          </Text>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryChip, { backgroundColor: theme.successSoft }]}>
              <Text style={[styles.summaryValue, { color: theme.success }]}>
                {validCount} format valid
              </Text>
            </View>
            <View
              style={[
                styles.summaryChip,
                {
                  backgroundColor:
                    invalidCount > 0 ? theme.warningSoft : theme.surfaceSubtle,
                },
              ]}>
              <Text
                style={[
                  styles.summaryValue,
                  {
                    color: invalidCount > 0 ? theme.warning : theme.textSecondary,
                  },
                ]}>
                {invalidCount} perlu dilengkapi
              </Text>
            </View>
          </View>

          <View style={[styles.infoBanner, { backgroundColor: theme.surfaceSubtle }]}>
            <Text style={[styles.infoText, { color: theme.textSecondary }]}>
              Data belum disimpan ke Firestore. Review interaktif (Accept / Deny / Edit
              baris) dan simpan batch terhubung pada FR-S4-P1-04.
            </Text>
          </View>

          <View style={styles.previewList}>
            {parseResult.rows.slice(0, MAX_PREVIEW_ROWS).map((row) => {
              const errorEntries = Object.values(row.errors).filter(
                (msg): msg is string => Boolean(msg)
              );
              const hasErrors = errorEntries.length > 0;

              return (
                <View
                  key={row.rowId}
                  style={[
                    styles.previewItem,
                    {
                      backgroundColor: hasErrors
                        ? theme.warningSoft
                        : theme.surfaceSubtle,
                    },
                  ]}>
                  <View style={styles.previewTop}>
                    <Text style={[styles.previewRowNum, { color: theme.textSecondary }]}>
                      Baris #{row.rowNumber}
                    </Text>
                    <Text
                      style={[
                        styles.previewStatus,
                        { color: hasErrors ? theme.warning : theme.success },
                      ]}>
                      {hasErrors ? 'Perlu dilengkapi' : 'Siap direview'}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={2}
                    style={[styles.previewTitle, { color: theme.textPrimary }]}>
                    {formatRowTitle(kind, row)}
                  </Text>
                  <Text style={[styles.previewMeta, { color: theme.textSecondary }]}>
                    {formatRowMeta(kind, row)}
                  </Text>
                  {hasErrors ? (
                    <Text style={[styles.previewError, { color: theme.error }]}>
                      {errorEntries.join(' · ')}
                    </Text>
                  ) : null}
                </View>
              );
            })}
            {parseResult.rows.length > MAX_PREVIEW_ROWS ? (
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                Menampilkan {MAX_PREVIEW_ROWS} dari {parseResult.rows.length} baris.
              </Text>
            ) : null}
          </View>
        </View>
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  summaryChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  summaryValue: { ...Typography.caption, fontWeight: '700' },
  infoBanner: {
    borderRadius: Radius.md,
    padding: Spacing.two,
  },
  infoText: { ...Typography.caption },
  previewList: { gap: Spacing.two },
  previewItem: {
    borderRadius: Radius.lg,
    padding: Spacing.two,
    gap: 4,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  previewRowNum: { ...Typography.caption },
  previewStatus: { ...Typography.caption, fontWeight: '700' },
  previewTitle: { ...Typography.bodyStrong },
  previewMeta: { ...Typography.caption },
  previewError: { ...Typography.caption, fontWeight: '600' },
});
