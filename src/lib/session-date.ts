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

/**
 * Tanggal sesi disimpan sebagai string yang mudah dibaca
 * (contoh: "Senin, 26 Okt 2026"). Fungsi ini mengubahnya menjadi nilai yang
 * dapat diurutkan tanpa mengubah format tampilan.
 */
export function parseSessionDate(date: string): number {
  const match = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(date);

  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const day = Number(match[1]);
  const month = MONTHS[match[2].slice(0, 3).toLowerCase()];
  const year = Number(match[3]);

  if (month === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  return new Date(year, month, day).getTime();
}

export function compareSessions(a: Session, b: Session): number {
  const dateA = parseSessionDate(a.date);
  const dateB = parseSessionDate(b.date);

  if (dateA !== dateB) {
    return dateA < dateB ? -1 : 1;
  }

  const byStartTime = a.startTime.localeCompare(b.startTime);
  if (byStartTime !== 0) {
    return byStartTime;
  }

  return a.id.localeCompare(b.id);
}
