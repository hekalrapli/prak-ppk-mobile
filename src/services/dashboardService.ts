// src/services/dashboardService.ts
import { parseSessionDate } from '../lib/session-date';
import type { FineDoc, Practicum, Session } from '../types/attendance';
import type { Laboratory } from '../types/location';
import {
  calculateFineFinancialSummary,
  filterFinesByPeriod,
  type FineFinancialSummary,
} from './fineService';

export type DashboardPeriod = 'day' | 'week' | 'month';

export interface LabLiveStatusInfo {
  lab: Laboratory;
  status: 'open' | 'upcoming' | 'closed';
  statusLabel: 'Dibuka / Berlangsung' | 'Akan Datang' | 'Kosong / Selesai';
  currentSession?: Session;
  currentPracticumName?: string;
  assignedAsprakNames: string[];
}

export interface DashboardSessionItem {
  session: Session;
  practicumName: string;
  className: string;
  labName: string;
  locationLabel: string;
  assistantName: string;
}

export interface AslabDashboardData {
  period: DashboardPeriod;
  totalLabs: number;
  totalStudents: number;
  openSessionsCount: number;
  upcomingSessionsCount: number;
  closedSessionsCount: number;
  labStatuses: LabLiveStatusInfo[];
  activeAndUpcomingSessions: DashboardSessionItem[];
  pastSessionsRecap: DashboardSessionItem[];
  financeSummary: FineFinancialSummary;
}

/**
 * Menghitung rentang waktu (epoch ms) untuk periode filter:
 * - day: 00:00:00 s.d. 23:59:59 hari ini
 * - week: Senin 00:00:00 s.d. Minggu 23:59:59 minggu ini
 * - month: Tanggal 1 s.d. akhir bulan berjalan
 */
export function getPeriodDateRange(period: DashboardPeriod): {
  minTime: number;
  maxTime: number;
} {
  const now = new Date();
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  if (period === 'day') {
    return { minTime: startOfDay, maxTime: endOfDay };
  }

  if (period === 'week') {
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Senin, 6 = Minggu
    const startOfWeek = startOfDay - dayOfWeek * 24 * 60 * 60 * 1000;
    const endOfWeek = startOfWeek + 7 * 24 * 60 * 60 * 1000 - 1;
    return { minTime: startOfWeek, maxTime: endOfWeek };
  }

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  ).getTime();
  return { minTime: startOfMonth, maxTime: endOfMonth };
}

/**
 * Memeriksa apakah tanggal sesi berada dalam rentang periode filter
 */
export function isSessionDateInPeriod(
  dateStr: string,
  period: DashboardPeriod
): boolean {
  const time = parseSessionDate(dateStr);
  if (!Number.isFinite(time) || time <= 0) {
    // Fallback: coba Date.parse standar
    const isoParsed = Date.parse(dateStr);
    if (Number.isFinite(isoParsed)) {
      const { minTime, maxTime } = getPeriodDateRange(period);
      return isoParsed >= minTime && isoParsed <= maxTime;
    }
    // Jika tidak dapat di-parse, tetap sertakan agar tidak hilang
    return true;
  }

  const { minTime, maxTime } = getPeriodDateRange(period);
  return time >= minTime && time <= maxTime;
}

/**
 * Filter daftar sesi berdasarkan periode aktif
 */
export function filterSessionsByPeriod(
  sessions: Session[],
  period: DashboardPeriod
): Session[] {
  return sessions.filter((session) =>
    isSessionDateInPeriod(session.date, period)
  );
}

/**
 * Menentukan status live per laboratorium:
 * - 'open' ('Dibuka / Berlangsung') jika ada sesi yang sedang dibuka
 * - 'upcoming' ('Akan Datang') jika ada sesi mendatang di lab ini
 * - 'closed' ('Kosong / Selesai') jika tidak ada kegiatan aktif
 */
export function getLabLiveStatus(
  lab: Laboratory,
  sessions: Session[],
  practicumMap: Map<string, Practicum>
): LabLiveStatusInfo {
  // Cari sesi yang terkait dengan lab ini (labId, lab_id, atau pencocokan nama gedung/ruang)
  const labSessions = sessions.filter((session) => {
    if (session.labId === lab.id || session.lab_id === lab.id) return true;
    if (session.room && lab.name) {
      const roomLower = session.room.toLowerCase();
      const labLower = lab.name.toLowerCase();
      return (
        roomLower.includes(labLower) ||
        labLower.includes(roomLower) ||
        (lab.building && roomLower.includes(lab.building.toLowerCase()))
      );
    }
    return false;
  });

  const openSession = labSessions.find((s) => s.status === 'open');
  if (openSession) {
    const practicum = practicumMap.get(openSession.practicumId);
    return {
      lab,
      status: 'open',
      statusLabel: 'Dibuka / Berlangsung',
      currentSession: openSession,
      currentPracticumName: practicum?.name ?? 'Praktikum',
      assignedAsprakNames: practicum?.assistantName ? [practicum.assistantName] : [],
    };
  }

  const upcomingSession = labSessions.find((s) => s.status === 'upcoming');
  if (upcomingSession) {
    const practicum = practicumMap.get(upcomingSession.practicumId);
    return {
      lab,
      status: 'upcoming',
      statusLabel: 'Akan Datang',
      currentSession: upcomingSession,
      currentPracticumName: practicum?.name ?? 'Praktikum',
      assignedAsprakNames: practicum?.assistantName ? [practicum.assistantName] : [],
    };
  }

  return {
    lab,
    status: 'closed',
    statusLabel: 'Kosong / Selesai',
    assignedAsprakNames: [],
  };
}

/**
 * Menghitung seluruh metrik Dashboard Aslab secara deterministik
 */
export function aggregateAslabDashboardData(params: {
  period: DashboardPeriod;
  labs: Laboratory[];
  practicums: Practicum[];
  sessions: Session[];
  fines: FineDoc[];
}): AslabDashboardData {
  const { period, labs, practicums, sessions, fines } = params;

  const practicumMap = new Map<string, Practicum>(
    practicums.map((p) => [p.id, p])
  );

  const labMap = new Map<string, Laboratory>(labs.map((l) => [l.id, l]));

  // Hitung total praktikan unik terdaftar lintas laboratorium & praktikum
  const uniqueStudentUids = new Set<string>();
  labs.forEach((lab) => {
    lab.studentIds?.forEach((uid) => uniqueStudentUids.add(uid));
  });
  practicums.forEach((p) => {
    p.studentIds?.forEach((uid) => uniqueStudentUids.add(uid));
  });

  // Filter sesi berdasarkan periode aktif
  const filteredSessions = filterSessionsByPeriod(sessions, period);

  // Status live per laboratorium
  const labStatuses: LabLiveStatusInfo[] = labs.map((lab) =>
    getLabLiveStatus(lab, filteredSessions, practicumMap)
  );

  // Daftar sesi aktif dan mendatang
  const activeAndUpcomingSessions: DashboardSessionItem[] = [];
  // Daftar riwayat kegiatan selesai
  const pastSessionsRecap: DashboardSessionItem[] = [];

  let openSessionsCount = 0;
  let upcomingSessionsCount = 0;
  let closedSessionsCount = 0;

  filteredSessions.forEach((session) => {
    const practicum = practicumMap.get(session.practicumId);
    const lab = session.labId
      ? labMap.get(session.labId)
      : session.lab_id
        ? labMap.get(session.lab_id)
        : undefined;

    const practicumName = practicum?.name ?? 'Praktikum';
    const className = practicum?.className ?? '';
    const labName = lab?.name ?? session.room ?? 'Laboratorium';
    const locationLabel = lab?.building ? `${labName} · ${lab.building}` : labName;
    const assistantName = practicum?.assistantName ?? 'Asisten';

    const item: DashboardSessionItem = {
      session,
      practicumName,
      className,
      labName,
      locationLabel,
      assistantName,
    };

    if (session.status === 'open') {
      openSessionsCount += 1;
      activeAndUpcomingSessions.push(item);
    } else if (session.status === 'upcoming') {
      upcomingSessionsCount += 1;
      activeAndUpcomingSessions.push(item);
    } else if (session.status === 'closed') {
      closedSessionsCount += 1;
      pastSessionsRecap.push(item);
    }
  });

  // Agregasi riwayat keuangan denda untuk periode aktif
  const filteredFines = filterFinesByPeriod(fines, period);
  const financeSummary = calculateFineFinancialSummary(filteredFines);

  return {
    period,
    totalLabs: labs.length,
    totalStudents: uniqueStudentUids.size,
    openSessionsCount,
    upcomingSessionsCount,
    closedSessionsCount,
    labStatuses,
    activeAndUpcomingSessions,
    pastSessionsRecap,
    financeSummary,
  };
}
