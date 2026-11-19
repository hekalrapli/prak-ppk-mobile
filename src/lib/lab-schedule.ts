// src/lib/lab-schedule.ts
import type { Practicum, Session } from '@/types/attendance';
import type { Laboratory } from '@/types/location';
import { findLaboratoryForSession } from '@/services/laboratoryService';
import { parseSessionDate } from './session-date';

/**
 * FR-P1-04: perhitungan jadwal praktikum untuk satu laboratorium.
 *
 * Sesi disimpan sebagai subkoleksi `practicums/{pid}/sessions`, sehingga
 * filtering per laboratorium dilakukan setelah listener praktikum+s sesi
 * dimuat (lihat `usePracticumFeed`). Dengan begitu tidak perlu collection-group
 * index baru dan Security Rules yang ada tetap berlaku.
 */

export interface LabScheduleEntry {
  session: Session;
  practicum: Practicum;
  /** Epoch ms awal sesi; Infinity bila tanggal/jam tidak dapat diurai. */
  startsAt: number;
  /** Epoch ms akhir sesi; Infinity bila tanggal/jam tidak dapat diurai. */
  endsAt: number;
}

export interface LabSchedule {
  /** Sesi `open`, atau sesi yang waktunya sedang berjalan. */
  ongoing: LabScheduleEntry[];
  /** Sesi berikutnya setelah waktu sekarang (null bila tidak ada). */
  next: LabScheduleEntry | null;
  /** Sesi lain milik laboratorium ini (riwayat/akan datang). */
  others: LabScheduleEntry[];
  /** True bila laboratorium ini belum memiliki sesi sama sekali. */
  isEmpty: boolean;
}

function timeToMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function sessionRange(session: Session): { startsAt: number; endsAt: number } {
  const midnight = parseSessionDate(session.date);
  const startMinutes = timeToMinutes(session.startTime);
  const endMinutes = timeToMinutes(session.endTime);

  if (!Number.isFinite(midnight) || startMinutes === null || endMinutes === null) {
    return { startsAt: Number.POSITIVE_INFINITY, endsAt: Number.POSITIVE_INFINITY };
  }

  const minuteMs = 60_000;
  return {
    startsAt: midnight + startMinutes * minuteMs,
    endsAt: midnight + endMinutes * minuteMs,
  };
}

export function buildLabSchedule(params: {
  laboratory: Laboratory;
  /** Semua laboratorium, dipakai untuk mencocokkan sesi lama tanpa labId. */
  laboratories: Laboratory[];
  practicums: Practicum[];
  sessions: Session[];
  /** Waktu acuan; dapat diinjeksi untuk pengujian. */
  now?: number;
}): LabSchedule {
  const now = params.now ?? Date.now();
  const practicumById = new Map(
    params.practicums.map((practicum) => [practicum.id, practicum])
  );

  const entries: LabScheduleEntry[] = [];

  for (const session of params.sessions) {
    const practicum = practicumById.get(session.practicumId);
    if (!practicum) continue;

    const sessionLab = findLaboratoryForSession(params.laboratories, session);
    if (!sessionLab || sessionLab.id !== params.laboratory.id) continue;

    const range = sessionRange(session);
    entries.push({
      session,
      practicum,
      startsAt: range.startsAt,
      endsAt: range.endsAt,
    });
  }

  entries.sort((a, b) => {
    if (a.startsAt !== b.startsAt) return a.startsAt - b.startsAt;
    return a.session.startTime.localeCompare(b.session.startTime);
  });

  const ongoing = entries.filter(
    (entry) =>
      entry.session.status === 'open' ||
      (entry.session.status !== 'closed' &&
        entry.startsAt <= now &&
        now <= entry.endsAt)
  );
  const ongoingIds = new Set(ongoing.map((entry) => entry.session.id));

  const upcoming = entries.filter(
    (entry) =>
      !ongoingIds.has(entry.session.id) &&
      entry.session.status !== 'closed' &&
      Number.isFinite(entry.startsAt) &&
      entry.startsAt > now
  );

  const next = upcoming[0] ?? null;
  const others = entries.filter(
    (entry) =>
      !ongoingIds.has(entry.session.id) && entry.session.id !== next?.session.id
  );

  return {
    ongoing,
    next,
    others,
    isEmpty: entries.length === 0,
  };
}
