import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { validateLaboratoryInput } from '@/services/labService';
import type {
  BulkInsertKind,
  BulkLabRowData,
  BulkMemberRowData,
  BulkParseResult,
  BulkRowItem,
} from '@/types/attendance';
import { BULK_TEMPLATE_COLUMNS } from './bulk-templates';

export type BulkRowForKind<K extends BulkInsertKind> = K extends 'labs'
  ? BulkLabRowData
  : BulkMemberRowData;

export type PickAndParseResult<K extends BulkInsertKind> =
  | { canceled: true }
  | { canceled: false; result: BulkParseResult<BulkRowForKind<K>> };

const KIND_LABELS: Record<BulkInsertKind, string> = {
  labs: 'Bulk Laboratorium',
  praktikan: 'Bulk Praktikan',
  asprak: 'Bulk Asprak',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const IDENTIFIER_REGEX = /^\d{8,20}$/;

function detectDelimiter(headerLine: string): ',' | ';' {
  let commaCount = 0;
  let semicolonCount = 0;
  let inQuotes = false;

  for (let i = 0; i < headerLine.length; i++) {
    const ch = headerLine[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === ',') commaCount += 1;
      if (ch === ';') semicolonCount += 1;
    }
  }

  return semicolonCount > commaCount ? ';' : ',';
}

function stripBomAndNormalize(content: string): string {
  const withoutBom = content.startsWith('\uFEFF') ? content.slice(1) : content;
  return withoutBom.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function hasBinaryControlChars(content: string): boolean {
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    if (code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13)) {
      return true;
    }
  }
  return false;
}

/**
 * Mengurai teks CSV (koma atau titik-koma dari Excel Indonesia) menjadi matriks string.
 */
export function parseCsvMatrix(content: string): string[][] {
  const normalized = stripBomAndNormalize(content);
  if (!normalized.trim()) {
    return [];
  }

  const firstLineEnd = normalized.indexOf('\n');
  const firstLine = firstLineEnd === -1 ? normalized : normalized.slice(0, firstLineEnd);
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if (ch === '\n') {
      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += ch;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((cell) => cell.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function validateLabRowData(
  data: BulkLabRowData
): Partial<Record<keyof BulkLabRowData, string>> {
  const { errors } = validateLaboratoryInput({
    nama: data.nama,
    gedung: data.gedung,
    courseName: '__template_check__',
    latitude: data.latitude,
    longitude: data.longitude,
    radius_meter: data.radius_meter,
    grace_period_minutes: data.grace_period_minutes,
    late_fine_amount: data.late_fine_amount,
  });

  const rowErrors: Partial<Record<keyof BulkLabRowData, string>> = {};
  if (errors.nama) rowErrors.nama = errors.nama;
  if (errors.gedung) rowErrors.gedung = errors.gedung;
  if (errors.latitude) rowErrors.latitude = errors.latitude;
  if (errors.longitude) rowErrors.longitude = errors.longitude;
  if (errors.radius_meter) rowErrors.radius_meter = errors.radius_meter;
  if (errors.grace_period_minutes) {
    rowErrors.grace_period_minutes = errors.grace_period_minutes;
  }
  if (errors.late_fine_amount) rowErrors.late_fine_amount = errors.late_fine_amount;
  return rowErrors;
}

export function validateMemberRowData(
  kind: 'praktikan' | 'asprak',
  data: BulkMemberRowData
): Partial<Record<keyof BulkMemberRowData, string>> {
  const idLabel = kind === 'praktikan' ? 'NIM' : 'NIP';
  const rowErrors: Partial<Record<keyof BulkMemberRowData, string>> = {};
  const identifier = data.identifier.trim();
  const email = data.email.trim().toLowerCase();
  const nama = data.nama.trim();

  if (!identifier && !email) {
    rowErrors.identifier = `${idLabel} atau email wajib diisi salah satu.`;
  } else {
    if (identifier && !IDENTIFIER_REGEX.test(identifier)) {
      rowErrors.identifier = `${idLabel} harus 8–20 digit angka.`;
    }
    if (email && !EMAIL_REGEX.test(email)) {
      rowErrors.email = 'Format email tidak valid.';
    }
  }

  if (nama.length > 60) {
    rowErrors.nama = 'Nama maksimal 60 karakter.';
  }

  return rowErrors;
}

function buildLabRow(
  rowNumber: number,
  rawRow: string[],
  colIndex: Map<string, number>
): BulkRowItem<BulkLabRowData> {
  const get = (col: string) => {
    const idx = colIndex.get(col);
    return idx === undefined ? '' : (rawRow[idx] ?? '').trim();
  };

  const data: BulkLabRowData = {
    nama: get('nama'),
    gedung: get('gedung'),
    latitude: get('latitude'),
    longitude: get('longitude'),
    radius_meter: get('radius_meter'),
    grace_period_minutes: get('grace_period_minutes'),
    late_fine_amount: get('late_fine_amount'),
  };

  return {
    rowId: `labs-${rowNumber}`,
    rowNumber,
    data,
    decision: 'pending',
    errors: validateLabRowData(data),
  };
}

function buildMemberRow(
  kind: 'praktikan' | 'asprak',
  rowNumber: number,
  rawRow: string[],
  colIndex: Map<string, number>
): BulkRowItem<BulkMemberRowData> {
  const idColumn = kind === 'praktikan' ? 'nim' : 'nip';
  const get = (col: string) => {
    const idx = colIndex.get(col);
    return idx === undefined ? '' : (rawRow[idx] ?? '').trim();
  };

  const data: BulkMemberRowData = {
    identifier: get(idColumn),
    email: get('email').toLowerCase(),
    nama: get('nama'),
  };

  return {
    rowId: `${kind}-${rowNumber}`,
    rowNumber,
    data,
    decision: 'pending',
    errors: validateMemberRowData(kind, data),
  };
}

export function parseBulkCsv<K extends BulkInsertKind>(
  kind: K,
  content: string,
  fileName = 'import.csv'
): BulkParseResult<BulkRowForKind<K>> {
  const expectedColumns = [...BULK_TEMPLATE_COLUMNS[kind]];
  const normalized = stripBomAndNormalize(content);

  if (!normalized.trim()) {
    return {
      ok: false,
      error: `File "${fileName}" kosong. Unduh template dan isi minimal satu baris data.`,
      expectedColumns,
    };
  }

  if (hasBinaryControlChars(normalized)) {
    return {
      ok: false,
      error: `File "${fileName}" bukan file CSV teks yang valid. Pastikan formatnya .csv (UTF-8).`,
      expectedColumns,
    };
  }

  const matrix = parseCsvMatrix(normalized);
  if (matrix.length === 0) {
    return {
      ok: false,
      error: `File "${fileName}" kosong. Unduh template dan isi minimal satu baris data.`,
      expectedColumns,
    };
  }

  const rawHeaders = [...matrix[0]];
  while (rawHeaders.length > 0 && rawHeaders[rawHeaders.length - 1].trim() === '') {
    rawHeaders.pop();
  }

  const headers = rawHeaders.map((cell) => cell.trim().toLowerCase());
  const colIndex = new Map<string, number>();
  headers.forEach((header, index) => {
    if (header && !colIndex.has(header)) {
      colIndex.set(header, index);
    }
  });

  const missingColumns = expectedColumns.filter((col) => !colIndex.has(col));
  if (missingColumns.length > 0) {
    return {
      ok: false,
      error:
        `Header kolom file "${fileName}" tidak sesuai untuk ${KIND_LABELS[kind]}. ` +
        `Kolom hilang: ${missingColumns.join(', ')}. Kolom wajib: ${expectedColumns.join(', ')}.`,
      expectedColumns,
    };
  }

  const dataRows = matrix.slice(1);
  if (dataRows.length === 0) {
    return {
      ok: false,
      error: `File "${fileName}" hanya berisi header tanpa baris data.`,
      expectedColumns,
    };
  }

  const rows = dataRows.map((rawRow, idx) => {
    const rowNumber = idx + 2;
    if (kind === 'labs') {
      return buildLabRow(rowNumber, rawRow, colIndex) as BulkRowItem<BulkRowForKind<K>>;
    }
    return buildMemberRow(
      kind as 'praktikan' | 'asprak',
      rowNumber,
      rawRow,
      colIndex
    ) as BulkRowItem<BulkRowForKind<K>>;
  });

  return {
    ok: true,
    fileName,
    headers,
    rows,
  };
}

async function readPickedAssetText(
  asset: DocumentPicker.DocumentPickerAsset
): Promise<string> {
  if (Platform.OS === 'web') {
    if (asset.file) {
      return asset.file.text();
    }
    const response = await fetch(asset.uri);
    return response.text();
  }

  const pickedFile = new File(asset.uri);
  return pickedFile.text();
}

export async function pickAndParseBulkCsv<K extends BulkInsertKind>(
  kind: K
): Promise<PickAndParseResult<K>> {
  const expectedColumns = [...BULK_TEMPLATE_COLUMNS[kind]];
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'application/csv', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (picked.canceled || !picked.assets || picked.assets.length === 0) {
    return { canceled: true };
  }

  const asset = picked.assets[0];
  const fileName = asset.name || 'import.csv';
  const lowerName = fileName.toLowerCase();

  if (
    lowerName.includes('.') &&
    !lowerName.endsWith('.csv') &&
    !lowerName.endsWith('.txt')
  ) {
    return {
      canceled: false,
      result: {
        ok: false,
        error: `Format file "${fileName}" tidak didukung. Pilih file berakhiran .csv sesuai template.`,
        expectedColumns,
      },
    };
  }

  try {
    const content = await readPickedAssetText(asset);
    return {
      canceled: false,
      result: parseBulkCsv(kind, content, fileName),
    };
  } catch (err) {
    return {
      canceled: false,
      result: {
        ok: false,
        error:
          err instanceof Error
            ? `Gagal membaca file "${fileName}": ${err.message}`
            : `Gagal membaca file "${fileName}".`,
        expectedColumns,
      },
    };
  }
}
