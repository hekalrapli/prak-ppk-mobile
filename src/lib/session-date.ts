import type { Session } from '../types/attendance';

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  mei: 4,
  may: 4,
  jun: 5,
  jul: 6,
  agu: 7,
  agt: 7,
  aug: 7,
  sep: 8,
  okt: 9,
  oct: 9,
  nov: 10,
  des: 11,
  dec: 11,
};

const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
const MONTHS_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

const MONTHS_FULL_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function toValidMidnightTimestamp(year: number, monthIndex: number, day: number): number {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    !Number.isInteger(day) ||
    year < 1970 ||
    year > 2100 ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > 31
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const constructed = new Date(year, monthIndex, day);
  if (
    constructed.getFullYear() !== year ||
    constructed.getMonth() !== monthIndex ||
    constructed.getDate() !== day
  ) {
    return Number.POSITIVE_INFINITY;
  }

  return constructed.getTime();
}

export function getStartOfDayTimestamp(reference = new Date()): number {
  return new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate()
  ).getTime();
}

/**
 * Mengubah string tanggal sesi menjadi timestamp tengah malam lokal (ms) agar
 * dapat diurutkan dan dibandingkan dengan akurat.
 *
 * Mendukung berbagai format yang umum dimasukkan pengguna/seed:
 * - Teks Indonesia/Inggris: "Senin, 26 Okt 2026", "28 November 2026", "5 Des 2026"
 * - ISO: "2026-11-28", "2026/11/28"
 * - Numerik DMY: "28/11/2026", "28-11-2026", "Sabtu, 28.11.2026"
 */
export function parseSessionDate(date: string): number {
  const trimmed = date.trim();
  if (!trimmed) {
    return Number.POSITIVE_INFINITY;
  }

  // 1. Format ISO YYYY-MM-DD atau YYYY/MM/DD (opsional diikuti jam T...)
  const isoMatch = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:$|[\sT])/.exec(trimmed);
  if (isoMatch) {
    return toValidMidnightTimestamp(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3])
    );
  }

  // 2. Format numerik DD/MM/YYYY, DD-MM-YYYY, atau DD.MM.YYYY
  const dmyMatch = /(?:^|[^\d])(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:$|[^\d])/.exec(
    trimmed
  );
  if (dmyMatch) {
    return toValidMidnightTimestamp(
      Number(dmyMatch[3]),
      Number(dmyMatch[2]) - 1,
      Number(dmyMatch[1])
    );
  }

  // 3. Format teks DD MMM YYYY / DD MMMM YYYY (mis. "Senin, 26 Okt 2026")
  const textMatch = /(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})/.exec(trimmed);
  if (textMatch) {
    const month = MONTHS[textMatch[2].slice(0, 3).toLowerCase()];
    if (month !== undefined) {
      return toValidMidnightTimestamp(Number(textMatch[3]), month, Number(textMatch[1]));
    }
  }

  return Number.POSITIVE_INFINITY;
}

/**
 * Mengubah jam sesi ("08:00", "8:30", "13.45") menjadi menit sejak 00:00
 * agar "8:00" selalu terurut sebelum "10:00".
 */
export function parseSessionTimeMinutes(time: string): number {
  const match = /^(\d{1,2})[:.](\d{2})$/.exec(time.trim());
  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return Number.POSITIVE_INFINITY;
  }

  return hours * 60 + minutes;
}

export function formatTimestampDisplay(midnightMs: number): string {
  const d = new Date(midnightMs);
  return `${DAYS_ID[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDateLabel(midnightMs: number, now = new Date()): string {
  const today = getStartOfDayTimestamp(now);
  const diffDays = Math.round((midnightMs - today) / DAY_MS);
  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Besok';
  if (diffDays === -1) return 'Kemarin';

  const d = new Date(midnightMs);
  return `${d.getDate()} ${MONTHS_SHORT_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthYearLabel(year: number, monthIndex: number): string {
  const safeMonth = Math.max(0, Math.min(11, monthIndex));
  return `${MONTHS_FULL_ID[safeMonth]} ${year}`;
}

/**
 * Mengembalikan label tampilan tanggal yang konsisten dalam Bahasa Indonesia.
 * Format teks yang sudah mudah dibaca dipertahankan, sedangkan format numerik
 * (mis. "2026-11-28" atau "28/11/2026") diformat menjadi "Sabtu, 28 Nov 2026".
 */
export function formatSessionDateDisplay(date: string): string {
  const trimmed = date.trim();
  if (!trimmed) {
    return 'Tanggal belum diatur';
  }

  const parsed = parseSessionDate(trimmed);
  if (!Number.isFinite(parsed)) {
    return trimmed;
  }

  // Pertahankan string yang sudah memiliki nama bulan/hari agar tidak mengubah format baku.
  if (/[A-Za-z]{3,}/.test(trimmed)) {
    return trimmed;
  }

  return formatTimestampDisplay(parsed);
}

/**
 * Menghasilkan label relatif ("Hari ini", "Besok", "Kemarin") bila tanggal sesi
 * berdekatan dengan hari ini.
 */
export function getRelativeDateLabel(date: string, now = new Date()): string | null {
  const parsed = parseSessionDate(date);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const today = getStartOfDayTimestamp(now);
  const diffDays = Math.round((parsed - today) / DAY_MS);

  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Besok';
  if (diffDays === -1) return 'Kemarin';
  return null;
}

/** Kunci kanonis untuk mengelompokkan sesi pada hari kalender yang sama. */
export function getSessionDateGroupKey(date: string): string {
  const parsed = parseSessionDate(date);
  if (Number.isFinite(parsed)) {
    return `ts:${parsed}`;
  }
  return `raw:${date.trim().toLowerCase()}`;
}

export function compareSessions(a: Session, b: Session): number {
  const dateA = parseSessionDate(a.date);
  const dateB = parseSessionDate(b.date);

  if (dateA !== dateB) {
    return dateA < dateB ? -1 : 1;
  }

  const startA = parseSessionTimeMinutes(a.startTime);
  const startB = parseSessionTimeMinutes(b.startTime);
  if (startA !== startB) {
    return startA < startB ? -1 : 1;
  }

  const byStartText = a.startTime.localeCompare(b.startTime);
  if (byStartText !== 0) {
    return byStartText;
  }

  const endA = parseSessionTimeMinutes(a.endTime);
  const endB = parseSessionTimeMinutes(b.endTime);
  if (endA !== endB) {
    return endA < endB ? -1 : 1;
  }

  return a.id.localeCompare(b.id);
}
