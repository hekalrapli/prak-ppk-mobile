import type { Practicum, Session } from '@/types/attendance';
import {
  compareSessions,
  formatSessionDateDisplay,
  getRelativeDateLabel,
  getSessionDateGroupKey,
  getStartOfDayTimestamp,
  parseSessionDate,
  parseSessionTimeMinutes,
} from './session-date';

export type ScheduleStatusFilter = 'active' | 'closed' | 'all';
export type ScheduleDateIndicator = 'open' | 'upcoming' | 'closed';

export interface ScheduleRow {
  session: Session;
  practicum: Practicum;
}

export interface SchedulePracticumOption {
  id: string;
  label: string;
  fullName: string;
  className: string;
  count: number;
}

export interface ScheduleTimeSlot {
  key: string;
  startTime: string;
  /** Terisi bila seluruh sesi dalam slot ini memiliki jam selesai yang sama. */
  endTime: string | null;
  rows: ScheduleRow[];
}

export interface ScheduleSection {
  key: string;
  title: string;
  relativeLabel: string | null;
  highlightTone?: 'open' | 'default';
  sessionCount: number;
  data: ScheduleTimeSlot[];
}

export interface OrganizedSchedule {
  statusCounts: {
    active: number;
    closed: number;
    all: number;
  };
  practicumOptions: SchedulePracticumOption[];
  /** Peta timestamp tengah malam lokal -> status tertinggi pada tanggal tsb (untuk titik kalender). */
  dateIndicators: Record<number, ScheduleDateIndicator>;
  highlight: ScheduleRow | null;
  sections: ScheduleSection[];
  filteredTotalCount: number;
}

const INDICATOR_PRIORITY: Record<ScheduleDateIndicator, number> = {
  open: 3,
  upcoming: 2,
  closed: 1,
};

function matchesStatusFilter(session: Session, filter: ScheduleStatusFilter): boolean {
  if (filter === 'active') {
    return session.status === 'open' || session.status === 'upcoming';
  }
  if (filter === 'closed') {
    return session.status === 'closed';
  }
  return true;
}

function matchesDateFilter(session: Session, selectedDateMs: number | null): boolean {
  if (selectedDateMs === null) {
    return true;
  }
  return parseSessionDate(session.date) === selectedDateMs;
}

function toSessionEpochMs(session: Session): number {
  const midnight = parseSessionDate(session.date);
  if (!Number.isFinite(midnight)) {
    return Number.POSITIVE_INFINITY;
  }
  const minutes = parseSessionTimeMinutes(session.startTime);
  return Number.isFinite(minutes) ? midnight + minutes * 60_000 : midnight;
}

function compareByProximityToNow(a: ScheduleRow, b: ScheduleRow, nowMs: number): number {
  const timeA = toSessionEpochMs(a.session);
  const timeB = toSessionEpochMs(b.session);
  const finiteA = Number.isFinite(timeA);
  const finiteB = Number.isFinite(timeB);

  if (finiteA && finiteB) {
    const diffA = Math.abs(timeA - nowMs);
    const diffB = Math.abs(timeB - nowMs);
    if (diffA !== diffB) {
      return diffA - diffB;
    }
  } else if (finiteA !== finiteB) {
    return finiteA ? -1 : 1;
  }

  return compareSessions(a.session, b.session);
}

/**
 * Memilih satu kartu sorotan utama:
 * 1. Prioritas utama: sesi yang sedang berlangsung (`open`), paling dekat dengan waktu sekarang.
 * 2. Fallback: sesi mendatang (`upcoming`) terdekat sejak hari ini ke depan; bila semua
 *    sesi `upcoming` bertanggal lampau, ambil yang paling baru (paling dekat dengan hari ini).
 */
export function pickHighlightRow(
  rows: ScheduleRow[],
  now = new Date()
): ScheduleRow | null {
  const nowMs = now.getTime();
  const todayMidnight = getStartOfDayTimestamp(now);

  const openRows = rows.filter((row) => row.session.status === 'open');
  if (openRows.length > 0) {
    return [...openRows].sort((a, b) => compareByProximityToNow(a, b, nowMs))[0];
  }

  const upcomingRows = rows.filter((row) => row.session.status === 'upcoming');
  if (upcomingRows.length === 0) {
    return null;
  }

  const todayOrFuture = upcomingRows.filter((row) => {
    const parsed = parseSessionDate(row.session.date);
    return Number.isFinite(parsed) && parsed >= todayMidnight;
  });

  if (todayOrFuture.length > 0) {
    return [...todayOrFuture].sort((a, b) => compareSessions(a.session, b.session))[0];
  }

  return [...upcomingRows].sort((a, b) => {
    const dateA = parseSessionDate(a.session.date);
    const dateB = parseSessionDate(b.session.date);
    const finiteA = Number.isFinite(dateA);
    const finiteB = Number.isFinite(dateB);

    if (finiteA && finiteB && dateA !== dateB) {
      return dateB - dateA;
    }
    if (finiteA !== finiteB) {
      return finiteA ? -1 : 1;
    }
    return compareSessions(a.session, b.session);
  })[0];
}

function formatPracticumShortLabel(
  practicum: Practicum,
  hasDuplicateName: boolean
): string {
  const rawName = practicum.name.trim();
  const stripped = rawName.replace(/^praktikum\s+/i, '').trim();
  const baseName = stripped || rawName || 'Praktikum';

  if (hasDuplicateName && practicum.className.trim()) {
    return `${baseName} · ${practicum.className.trim()}`;
  }
  return baseName;
}

function buildPracticumOptions(
  practicums: Practicum[],
  rows: ScheduleRow[],
  statusFilter: ScheduleStatusFilter,
  selectedDateMs: number | null
): SchedulePracticumOption[] {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    if (
      matchesStatusFilter(row.session, statusFilter) &&
      matchesDateFilter(row.session, selectedDateMs)
    ) {
      counts.set(row.practicum.id, (counts.get(row.practicum.id) ?? 0) + 1);
    }
  });

  const normalizedNameCounts = new Map<string, number>();
  practicums.forEach((practicum) => {
    const key = practicum.name.trim().toLowerCase();
    normalizedNameCounts.set(key, (normalizedNameCounts.get(key) ?? 0) + 1);
  });

  return [...practicums]
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name, 'id');
      if (byName !== 0) return byName;
      return a.className.localeCompare(b.className, 'id');
    })
    .map((practicum) => {
      const normalized = practicum.name.trim().toLowerCase();
      const duplicate = (normalizedNameCounts.get(normalized) ?? 0) > 1;
      return {
        id: practicum.id,
        label: formatPracticumShortLabel(practicum, duplicate),
        fullName: practicum.name.trim() || 'Praktikum',
        className: practicum.className.trim(),
        count: counts.get(practicum.id) ?? 0,
      };
    });
}

function buildDateIndicators(
  rows: ScheduleRow[]
): Record<number, ScheduleDateIndicator> {
  const indicators: Record<number, ScheduleDateIndicator> = {};

  rows.forEach((row) => {
    const midnight = parseSessionDate(row.session.date);
    if (!Number.isFinite(midnight)) {
      return;
    }

    const candidate: ScheduleDateIndicator = row.session.status;
    const existing = indicators[midnight];
    if (!existing || INDICATOR_PRIORITY[candidate] > INDICATOR_PRIORITY[existing]) {
      indicators[midnight] = candidate;
    }
  });

  return indicators;
}

function normalizeClockDisplay(time: string): string {
  const minutes = parseSessionTimeMinutes(time);
  if (!Number.isFinite(minutes)) {
    return time.trim() || '—';
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Mengelompokkan sesi pada hari yang sama ke dalam satu slot rentang jam
 * (mis. semua sesi 08:00–09:40 digabung di satu blok jam agar "08:00" tidak
 * diulang-ulang di sisi kiri timeline).
 */
function groupRowsIntoTimeSlots(
  sectionKey: string,
  rows: ScheduleRow[],
  preserveOrder = false
): ScheduleTimeSlot[] {
  const orderedRows = preserveOrder
    ? rows
    : [...rows].sort((a, b) => compareSessions(a.session, b.session));

  const slotMap = new Map<
    string,
    {
      startMinutes: number;
      startTime: string;
      rows: ScheduleRow[];
    }
  >();

  orderedRows.forEach((row) => {
    const startMinutes = parseSessionTimeMinutes(row.session.startTime);
    const startDisplay = normalizeClockDisplay(row.session.startTime);
    const dateKey = getSessionDateGroupKey(row.session.date);
    const slotKey = Number.isFinite(startMinutes)
      ? `${sectionKey}|${dateKey}|m:${startMinutes}`
      : `${sectionKey}|${dateKey}|raw:${startDisplay}`;

    const existing = slotMap.get(slotKey);
    if (existing) {
      existing.rows.push(row);
    } else {
      slotMap.set(slotKey, {
        startMinutes,
        startTime: startDisplay,
        rows: [row],
      });
    }
  });

  const slots = Array.from(slotMap.entries()).map(([key, bucket]) => {
    const endMinutesSet = new Set(
      bucket.rows.map((row) => parseSessionTimeMinutes(row.session.endTime))
    );
    const firstEnd = bucket.rows[0]?.session.endTime ?? '';
    const sharedEndTime =
      endMinutesSet.size === 1 && Number.isFinite(parseSessionTimeMinutes(firstEnd))
        ? normalizeClockDisplay(firstEnd)
        : null;

    return {
      key,
      startTime: bucket.startTime,
      endTime: sharedEndTime,
      rows: bucket.rows,
    };
  });

  return slots;
}

function groupRowsByDate(
  rows: ScheduleRow[],
  dateOrder: 'asc' | 'desc',
  now: Date
): ScheduleSection[] {
  const buckets = new Map<
    string,
    { timestamp: number; title: string; rawDate: string; rows: ScheduleRow[] }
  >();

  rows.forEach((row) => {
    const key = getSessionDateGroupKey(row.session.date);
    const parsed = parseSessionDate(row.session.date);
    const existing = buckets.get(key);

    if (existing) {
      existing.rows.push(row);
      if (!/[A-Za-z]{3,}/.test(existing.rawDate) && /[A-Za-z]{3,}/.test(row.session.date)) {
        existing.rawDate = row.session.date;
        existing.title = formatSessionDateDisplay(row.session.date);
      }
    } else {
      buckets.set(key, {
        timestamp: parsed,
        title: formatSessionDateDisplay(row.session.date),
        rawDate: row.session.date,
        rows: [row],
      });
    }
  });

  const sortedBuckets = Array.from(buckets.entries()).sort(([keyA, a], [keyB, b]) => {
    const finiteA = Number.isFinite(a.timestamp);
    const finiteB = Number.isFinite(b.timestamp);

    if (finiteA && finiteB) {
      if (a.timestamp !== b.timestamp) {
        return dateOrder === 'asc'
          ? a.timestamp - b.timestamp
          : b.timestamp - a.timestamp;
      }
    } else if (finiteA !== finiteB) {
      return finiteA ? -1 : 1;
    }

    return keyA.localeCompare(keyB, 'id');
  });

  return sortedBuckets.map(([key, bucket]) => ({
    key,
    title: bucket.title,
    relativeLabel: getRelativeDateLabel(bucket.rawDate, now),
    highlightTone: 'default',
    sessionCount: bucket.rows.length,
    data: groupRowsIntoTimeSlots(key, bucket.rows),
  }));
}

/**
 * Menyusun data tab Jadwal secara konsisten untuk Praktikan & Asisten:
 * - Filter berdasarkan praktikum terpilih, tanggal terpilih, & status (`active` / `closed` / `all`).
 * - Menghitung indikator titik kalender (`dateIndicators`) berdasarkan praktikum terpilih.
 * - Memilih 1 Highlight Card (`open` prioritas utama, lalu `upcoming` terdekat dari hari ini).
 * - Mengelompokkan tanggal secara cerdas (`Sedang dibuka`, hari ini/mendatang naik, lampau/selesai turun).
 */
export function organizeSchedule(params: {
  practicums: Practicum[];
  rows: ScheduleRow[];
  statusFilter: ScheduleStatusFilter;
  selectedPracticumId: string | null;
  selectedDateMs?: number | null;
  now?: Date;
}): OrganizedSchedule {
  const { practicums, rows, statusFilter } = params;
  const selectedDateMs = params.selectedDateMs ?? null;
  const selectedPracticumId =
    params.selectedPracticumId &&
    practicums.some((item) => item.id === params.selectedPracticumId)
      ? params.selectedPracticumId
      : null;
  const now = params.now ?? new Date();
  const todayMidnight = getStartOfDayTimestamp(now);
  const nowMs = now.getTime();

  const practicumOptions = buildPracticumOptions(
    practicums,
    rows,
    statusFilter,
    selectedDateMs
  );

  const practicumScopedRows = selectedPracticumId
    ? rows.filter((row) => row.practicum.id === selectedPracticumId)
    : rows;

  const dateIndicators = buildDateIndicators(practicumScopedRows);

  const dateAndPracticumRows = practicumScopedRows.filter((row) =>
    matchesDateFilter(row.session, selectedDateMs)
  );

  const activeRows = dateAndPracticumRows.filter(
    (row) => row.session.status === 'open' || row.session.status === 'upcoming'
  );
  const closedRows = dateAndPracticumRows.filter(
    (row) => row.session.status === 'closed'
  );

  const statusCounts = {
    active: activeRows.length,
    closed: closedRows.length,
    all: dateAndPracticumRows.length,
  };

  const filteredRows =
    statusFilter === 'active'
      ? activeRows
      : statusFilter === 'closed'
        ? closedRows
        : dateAndPracticumRows;

  const highlight =
    statusFilter === 'closed' ? null : pickHighlightRow(filteredRows, now);

  const remainingRows = highlight
    ? filteredRows.filter(
        (row) =>
          row.session.id !== highlight.session.id ||
          row.practicum.id !== highlight.practicum.id
      )
    : filteredRows;

  let sections: ScheduleSection[];

  if (statusFilter === 'closed') {
    sections = groupRowsByDate(remainingRows, 'desc', now);
  } else {
    const extraOpenRows = remainingRows
      .filter((row) => row.session.status === 'open')
      .sort((a, b) => compareByProximityToNow(a, b, nowMs));

    const nonOpenRows = remainingRows.filter((row) => row.session.status !== 'open');

    const todayAndFutureRows: ScheduleRow[] = [];
    const pastRows: ScheduleRow[] = [];
    const unparsedRows: ScheduleRow[] = [];

    nonOpenRows.forEach((row) => {
      const parsed = parseSessionDate(row.session.date);
      if (!Number.isFinite(parsed)) {
        unparsedRows.push(row);
      } else if (parsed >= todayMidnight) {
        todayAndFutureRows.push(row);
      } else {
        pastRows.push(row);
      }
    });

    sections = [
      ...(extraOpenRows.length > 0
        ? [
            {
              key: 'open-now',
              title: 'Sedang dibuka',
              relativeLabel: null,
              highlightTone: 'open' as const,
              sessionCount: extraOpenRows.length,
              data: groupRowsIntoTimeSlots('open-now', extraOpenRows, true),
            },
          ]
        : []),
      ...groupRowsByDate(todayAndFutureRows, 'asc', now),
      ...groupRowsByDate(pastRows, 'desc', now),
      ...groupRowsByDate(unparsedRows, 'asc', now),
    ];
  }

  return {
    statusCounts,
    practicumOptions,
    dateIndicators,
    highlight,
    sections,
    filteredTotalCount: filteredRows.length,
  };
}
