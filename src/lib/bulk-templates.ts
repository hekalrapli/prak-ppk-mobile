import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { BulkInsertKind } from '@/types/attendance';

export interface BulkTemplateSpec {
  kind: BulkInsertKind;
  filename: string;
  title: string;
  headers: readonly string[];
  sampleRows: readonly (readonly string[])[];
}

export const BULK_TEMPLATE_COLUMNS: Record<BulkInsertKind, readonly string[]> = {
  labs: [
    'nama',
    'gedung',
    'latitude',
    'longitude',
    'radius_meter',
    'grace_period_minutes',
    'late_fine_amount',
  ],
  praktikan: ['nim', 'email', 'nama'],
  asprak: ['nip', 'email', 'nama'],
};

const BULK_TEMPLATE_SPECS: Record<BulkInsertKind, BulkTemplateSpec> = {
  labs: {
    kind: 'labs',
    filename: 'template-bulk-laboratorium.csv',
    title: 'Template Bulk Laboratorium',
    headers: BULK_TEMPLATE_COLUMNS.labs,
    sampleRows: [
      [
        'Lab Pemrograman 1',
        'Gedung E Lantai 2',
        '-7.049821',
        '110.439123',
        '50',
        '15',
        '5000',
      ],
      [
        'Lab Pemrograman 2',
        'Gedung E Lantai 3',
        '-7.049950',
        '110.439250',
        '75',
        '10',
        '10000',
      ],
    ],
  },
  praktikan: {
    kind: 'praktikan',
    filename: 'template-bulk-praktikan.csv',
    title: 'Template Bulk Praktikan',
    headers: BULK_TEMPLATE_COLUMNS.praktikan,
    sampleRows: [
      ['2211102034', 'nabila@contoh.com', 'Nabila Putri'],
      ['2211102041', 'bagas@contoh.com', 'Bagas Saputra'],
    ],
  },
  asprak: {
    kind: 'asprak',
    filename: 'template-bulk-asprak.csv',
    title: 'Template Bulk Asprak',
    headers: BULK_TEMPLATE_COLUMNS.asprak,
    sampleRows: [
      ['2211101008', 'raka@contoh.com', 'Raka Pratama'],
      ['2211101015', 'dinda@contoh.com', 'Dinda Maharani'],
    ],
  },
};

function escapeCsvCell(value: string): string {
  if (/[",\r\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function getBulkTemplateSpec(kind: BulkInsertKind): BulkTemplateSpec {
  return BULK_TEMPLATE_SPECS[kind];
}

export function buildBulkTemplateCsv(kind: BulkInsertKind): string {
  const spec = BULK_TEMPLATE_SPECS[kind];
  const lines = [
    spec.headers.map(escapeCsvCell).join(','),
    ...spec.sampleRows.map((row) => row.map(escapeCsvCell).join(',')),
  ];
  return lines.join('\r\n') + '\r\n';
}

export async function downloadBulkTemplate(
  kind: BulkInsertKind
): Promise<{ filename: string }> {
  const spec = BULK_TEMPLATE_SPECS[kind];
  const csvContent = buildBulkTemplateCsv(kind);

  if (Platform.OS === 'web') {
    if (typeof document === 'undefined' || typeof Blob === 'undefined') {
      throw new Error('Unduhan file tidak didukung di lingkungan web saat ini.');
    }
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', spec.filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      URL.revokeObjectURL(url);
    }
    return { filename: spec.filename };
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Fitur simpan atau bagikan file tidak tersedia di perangkat ini.');
  }

  const file = new File(Paths.cache, spec.filename);
  file.create({ intermediates: true, overwrite: true });
  await file.write(csvContent);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: spec.title,
    UTI: 'public.comma-separated-values-text',
  });

  return { filename: spec.filename };
}
