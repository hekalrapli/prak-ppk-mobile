import { formatTimestampToTime } from '../services/attendanceService';
import type {
  AttendanceDoc,
  AttendanceVerificationMethod,
  LeaveRequest,
} from '../types/attendance';
import type { UserProfile } from '../types/auth';

export type RecapCategory = 'in_radius' | 'out_of_radius' | 'leave' | 'absent';

export type RecapStatusLabel =
  | 'Dalam radius'
  | 'Verifikasi QR'
  | 'Di luar radius'
  | 'Belum terverifikasi'
  | 'Izin'
  | 'Belum hadir';

export interface RecapEntry {
  id: string;
  praktikanId: string;
  name: string;
  identifier: string;
  category: RecapCategory;
  statusLabel: RecapStatusLabel;
  timeDisplay: string;
  verificationMethod?: AttendanceVerificationMethod;
  distanceMeter?: number;
  isLocationVerified?: boolean;
  hasLocationData: boolean;
}

export interface RecapSummary {
  totalParticipants: number;
  inRadiusCount: number;
  outOfRadiusCount: number;
  leaveCount: number;
  absentCount: number;
}

export interface BuildRecapOptions {
  participants?: UserProfile[];
  studentIds?: string[];
  radiusMeter?: number;
}

const CATEGORY_ORDER: Record<RecapCategory, number> = {
  in_radius: 0,
  out_of_radius: 1,
  leave: 2,
  absent: 3,
};

function classifyAttendance(
  record: AttendanceDoc,
  radiusMeter?: number
): {
  category: 'in_radius' | 'out_of_radius';
  statusLabel: 'Dalam radius' | 'Verifikasi QR' | 'Di luar radius' | 'Belum terverifikasi';
  verificationMethod?: AttendanceVerificationMethod;
  distanceMeter?: number;
  isLocationVerified?: boolean;
  hasLocationData: boolean;
} {
  if (record.verificationMethod === 'qr') {
    return {
      category: 'in_radius',
      statusLabel: 'Verifikasi QR',
      verificationMethod: 'qr',
      hasLocationData: false,
    };
  }

  const distanceMeter =
    typeof record.distanceMeter === 'number' && Number.isFinite(record.distanceMeter)
      ? record.distanceMeter
      : undefined;
  const isLocationVerified =
    typeof record.isLocationVerified === 'boolean'
      ? record.isLocationVerified
      : undefined;
  const hasLocationData =
    distanceMeter !== undefined || isLocationVerified !== undefined;

  const hasValidRadius =
    typeof radiusMeter === 'number' && Number.isFinite(radiusMeter) && radiusMeter > 0;
  const withinSanityRadius =
    !hasValidRadius || distanceMeter === undefined || distanceMeter <= radiusMeter;

  // Sumber kebenaran verifikasi radius adalah jejak yang disimpan saat presensi (FR-P1-02);
  // perbandingan jarak dengan radius lab hanya sanity check baca-saja tanpa hitung ulang Haversine.
  if (isLocationVerified === true && withinSanityRadius) {
    return {
      category: 'in_radius',
      statusLabel: 'Dalam radius',
      distanceMeter,
      isLocationVerified,
      hasLocationData: true,
    };
  }

  const exceededRadius =
    hasValidRadius && distanceMeter !== undefined && distanceMeter > radiusMeter;
  const statusLabel =
    isLocationVerified === false || exceededRadius
      ? 'Di luar radius'
      : 'Belum terverifikasi';

  return {
    category: 'out_of_radius',
    statusLabel,
    distanceMeter,
    isLocationVerified,
    hasLocationData,
  };
}

/**
 * Gabungan presensi (dengan status verifikasi radius), izin yang disetujui,
 * dan daftar peserta yang belum hadir untuk monitoring real-time satu sesi.
 * Kehadiran selalu menang bila dokumen ganda muncul.
 */
export function buildRecapEntries(
  records: AttendanceDoc[],
  leaveRequests: LeaveRequest[],
  options?: BuildRecapOptions
): RecapEntry[] {
  const map = new Map<string, RecapEntry>();

  records.forEach((record) => {
    const classification = classifyAttendance(record, options?.radiusMeter);
    map.set(record.praktikanId, {
      id: `attendance-${record.praktikanId}`,
      praktikanId: record.praktikanId,
      name: record.praktikanName,
      identifier: record.praktikanNim,
      category: classification.category,
      statusLabel: classification.statusLabel,
      timeDisplay: formatTimestampToTime(record.recordedAt),
      verificationMethod: classification.verificationMethod,
      distanceMeter: classification.distanceMeter,
      isLocationVerified: classification.isLocationVerified,
      hasLocationData: classification.hasLocationData,
    });
  });

  leaveRequests
    .filter((request) => request.status === 'approved')
    .forEach((request) => {
      if (map.has(request.praktikanId)) {
        return;
      }

      map.set(request.praktikanId, {
        id: `leave-${request.praktikanId}`,
        praktikanId: request.praktikanId,
        name: request.praktikanName,
        identifier: request.praktikanNim,
        category: 'leave',
        statusLabel: 'Izin',
        timeDisplay: formatTimestampToTime(request.decidedAt ?? request.createdAt),
        hasLocationData: false,
      });
    });

  options?.participants?.forEach((participant) => {
    if (!participant.uid || map.has(participant.uid)) {
      return;
    }

    map.set(participant.uid, {
      id: `absent-${participant.uid}`,
      praktikanId: participant.uid,
      name: participant.name,
      identifier: participant.identifier,
      category: 'absent',
      statusLabel: 'Belum hadir',
      timeDisplay: '—',
      hasLocationData: false,
    });
  });

  options?.studentIds?.forEach((uid) => {
    if (!uid || map.has(uid)) {
      return;
    }

    map.set(uid, {
      id: `absent-${uid}`,
      praktikanId: uid,
      name: 'Praktikan',
      identifier: uid,
      category: 'absent',
      statusLabel: 'Belum hadir',
      timeDisplay: '—',
      hasLocationData: false,
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    const orderDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Ringkasan angka peserta per status. Hanya `inRadiusCount` yang dihitung
 * sebagai kehadiran terverifikasi berhasil.
 */
export function summarizeRecapEntries(entries: RecapEntry[]): RecapSummary {
  let inRadiusCount = 0;
  let outOfRadiusCount = 0;
  let leaveCount = 0;
  let absentCount = 0;

  entries.forEach((entry) => {
    if (entry.category === 'in_radius') {
      inRadiusCount += 1;
    } else if (entry.category === 'out_of_radius') {
      outOfRadiusCount += 1;
    } else if (entry.category === 'leave') {
      leaveCount += 1;
    } else {
      absentCount += 1;
    }
  });

  return {
    totalParticipants: entries.length,
    inRadiusCount,
    outOfRadiusCount,
    leaveCount,
    absentCount,
  };
}
