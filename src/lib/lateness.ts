// src/lib/lateness.ts
import { parseSessionDate } from './session-date';
import type { PunctualityStatus } from '../types/attendance';

export interface LatenessCalculationResult {
  punctualityStatus: PunctualityStatus;
  lateMinutes: number;
  deadlineAt: Date;
  sessionStartAt: Date;
  gracePeriodMinutes: number;
}

/**
 * Menggabungkan tanggal sesi dan jam mulai menjadi objek Date yang valid.
 * Mendukung format:
 * - date: "Senin, 26 Okt 2026", "26 Okt 2026", "2026-10-26", dsb.
 * - startTime: "08:00", "08.00", "8:00", dsb.
 */
export function parseSessionDateTime(
  sessionDate: string,
  startTime: string
): Date {
  const baseMillis = parseSessionDate(sessionDate);
  const now = new Date();

  let year = now.getFullYear();
  let month = now.getMonth();
  let day = now.getDate();

  if (Number.isFinite(baseMillis) && baseMillis > 0) {
    const d = new Date(baseMillis);
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  } else {
    // Coba ISO date parsing jika parseSessionDate mengembalikan Infinity
    const isoParsed = Date.parse(sessionDate);
    if (!Number.isNaN(isoParsed)) {
      const d = new Date(isoParsed);
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
    }
  }

  // Parse jam & menit dari startTime (mis. "08:00" atau "08.00")
  let hours = 8;
  let minutes = 0;

  if (startTime) {
    const cleaned = startTime.replace('.', ':').trim();
    const parts = cleaned.split(':');
    if (parts.length >= 2) {
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      if (Number.isFinite(h) && h >= 0 && h <= 23) hours = h;
      if (Number.isFinite(m) && m >= 0 && m <= 59) minutes = m;
    }
  }

  return new Date(year, month, day, hours, minutes, 0, 0);
}

/**
 * FR-S4-P2-03: Menentukan apakah presensi Tepat Waktu atau Terlambat berdasarkan
 * mekanisme Grace Period (toleransi keterlambatan).
 *
 * Aturan Bisnis:
 * - Waktu mulai sesi = sessionStartAt (date + startTime).
 * - Durasi toleransi = gracePeriodMinutes (default: 15 menit).
 * - Batas akhir tepat waktu = deadlineAt = sessionStartAt + gracePeriodMinutes.
 * - Jika recordedAt <= deadlineAt -> on_time, lateMinutes = 0, bebas denda.
 * - Jika recordedAt > deadlineAt -> late, lateMinutes = ceil((recordedAt - deadlineAt) / 60_000).
 */
export function calculateLateness(params: {
  sessionDate: string;
  startTime: string;
  recordedAt?: Date | number;
  gracePeriodMinutes?: number;
  openedAt?: string | number | Date;
}): LatenessCalculationResult {
  const { sessionDate, startTime, recordedAt, gracePeriodMinutes, openedAt } =
    params;

  const grace =
    typeof gracePeriodMinutes === 'number' &&
    Number.isFinite(gracePeriodMinutes) &&
    gracePeriodMinutes >= 0
      ? Math.round(gracePeriodMinutes)
      : 15;

  let sessionStartAt = parseSessionDateTime(sessionDate, startTime);

  // Jika parsed invalid date, fallback ke openedAt atau waktu sekarang
  if (Number.isNaN(sessionStartAt.getTime())) {
    if (openedAt) {
      const openedDate =
        openedAt instanceof Date ? openedAt : new Date(openedAt);
      if (!Number.isNaN(openedDate.getTime())) {
        sessionStartAt = openedDate;
      } else {
        sessionStartAt = new Date();
      }
    } else {
      sessionStartAt = new Date();
    }
  }

  const deadlineAt = new Date(sessionStartAt.getTime() + grace * 60 * 1000);

  const recordedTime =
    recordedAt instanceof Date
      ? recordedAt.getTime()
      : typeof recordedAt === 'number'
        ? recordedAt
        : Date.now();

  if (recordedTime <= deadlineAt.getTime()) {
    return {
      punctualityStatus: 'on_time',
      lateMinutes: 0,
      deadlineAt,
      sessionStartAt,
      gracePeriodMinutes: grace,
    };
  }

  const diffMs = recordedTime - deadlineAt.getTime();
  const lateMinutes = Math.max(1, Math.ceil(diffMs / (60 * 1000)));

  return {
    punctualityStatus: 'late',
    lateMinutes,
    deadlineAt,
    sessionStartAt,
    gracePeriodMinutes: grace,
  };
}

/**
 * FR-S4-P2-03: ID dokumen denda deterministik: "<sessionId>_<praktikanId>"
 * Mencegah duplikasi tagihan denda untuk kejadian keterlambatan yang sama.
 */
export function getDeterministicFineId(
  sessionId: string,
  praktikanId: string
): string {
  const cleanSid = String(sessionId ?? '').trim();
  const cleanUid = String(praktikanId ?? '').trim();
  return `${cleanSid}_${cleanUid}`;
}

export function formatLateMinutes(lateMinutes: number): string {
  if (lateMinutes <= 0) return 'Tepat Waktu';
  return `+${lateMinutes} mnt`;
}

export function formatRupiah(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return `Rp ${safeAmount.toLocaleString('id-ID')}`;
}
