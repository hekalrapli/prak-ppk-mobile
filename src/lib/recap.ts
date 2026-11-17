import { formatTimestampToTime } from '../services/attendanceService';
import type { AttendanceDoc, LeaveRequest } from '../types/attendance';

export interface RecapEntry {
  id: string;
  name: string;
  identifier: string;
  statusLabel: 'Hadir' | 'Izin';
  timeDisplay: string;
}

/**
 * Gabungan presensi dan izin yang disetujui untuk rekap satu sesi.
 * Kehadiran selalu menang bila dokumen ganda muncul.
 */
export function buildRecapEntries(
  records: AttendanceDoc[],
  leaveRequests: LeaveRequest[]
): RecapEntry[] {
  const map = new Map<string, RecapEntry>();

  records.forEach((record) => {
    map.set(record.praktikanId, {
      id: `attendance-${record.praktikanId}`,
      name: record.praktikanName,
      identifier: record.praktikanNim,
      statusLabel: 'Hadir',
      timeDisplay: formatTimestampToTime(record.recordedAt),
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
        name: request.praktikanName,
        identifier: request.praktikanNim,
        statusLabel: 'Izin',
        timeDisplay: formatTimestampToTime(request.decidedAt ?? request.createdAt),
      });
    });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
