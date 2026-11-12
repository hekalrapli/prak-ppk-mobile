// src/services/attendanceService.ts
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  collectionGroup,
  query,
  where,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { AttendanceDoc } from '../types/attendance';
import { getHumanReadableErrorMessage } from './errorHandler';

/**
 * Format server timestamp atau Date menjadi format HH:mm WIB
 */
export function formatTimestampToTime(ts: any): string {
  if (!ts) return '--:--';
  let date: Date;
  if (ts instanceof Timestamp) {
    date = ts.toDate();
  } else if (ts instanceof Date) {
    date = ts;
  } else if (typeof ts === 'number') {
    date = new Date(ts);
  } else if (typeof ts === 'string') {
    if (ts.includes(':') && ts.length <= 5) return ts; // sudah HH:mm
    date = new Date(ts);
  } else if (ts && typeof ts.toDate === 'function') {
    date = ts.toDate();
  } else {
    return '--:--';
  }

  if (isNaN(date.getTime())) return '--:--';

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * FR-14: Presensi Terintegrasi
 * Menyimpan presensi di practicums/{pid}/sessions/{sid}/attendance/{uid}
 * ID dokumen = UID praktikan, mencegah duplikasi di level Firestore.
 */
export async function recordAttendance(params: {
  practicumId: string;
  sessionId: string;
  praktikanId: string;
  praktikanName: string;
  praktikanNim: string;
}): Promise<{ success: boolean; recordedAtDisplay: string }> {
  const { practicumId, sessionId, praktikanId, praktikanName, praktikanNim } = params;

  try {
    // 1. Cek apakah ada izin yang sudah disetujui (approved) pada sesi ini
    const leaveDocRef = doc(db, 'practicums', practicumId, 'sessions', sessionId, 'leaveRequests', praktikanId);
    const leaveSnap = await getDoc(leaveDocRef);
    if (leaveSnap.exists() && leaveSnap.data()?.status === 'approved') {
      throw new Error('Anda tidak dapat melakukan presensi karena pengajuan izin Anda untuk sesi ini telah disetujui.');
    }

    // 2. Cek apakah dokumen presensi sudah ada
    const attendanceDocRef = doc(db, 'practicums', practicumId, 'sessions', sessionId, 'attendance', praktikanId);
    const existingSnap = await getDoc(attendanceDocRef);
    if (existingSnap.exists()) {
      throw new Error('Kehadiran sudah dicatat sebelumnya untuk sesi ini.');
    }

    // 3. Simpan dokumen presensi
    const now = new Date();
    await setDoc(attendanceDocRef, {
      praktikanId,
      praktikanName,
      praktikanNim,
      status: 'present',
      recordedAt: serverTimestamp(),
    });

    const displayTime = formatTimestampToTime(now);
    return { success: true, recordedAtDisplay: displayTime };
  } catch (error: any) {
    const message = getHumanReadableErrorMessage(error);
    throw new Error(message);
  }
}

/**
 * FR-15: Sinkronisasi real-time daftar kehadiran untuk satu sesi
 */
export function subscribeSessionAttendance(
  practicumId: string,
  sessionId: string,
  onData: (records: AttendanceDoc[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const attendanceColRef = collection(db, 'practicums', practicumId, 'sessions', sessionId, 'attendance');
    return onSnapshot(
      attendanceColRef,
      (snapshot) => {
        const records: AttendanceDoc[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          records.push({
            id: docSnap.id,
            praktikanId: data.praktikanId,
            praktikanName: data.praktikanName || 'Praktikan',
            praktikanNim: data.praktikanNim || '',
            status: data.status || 'present',
            recordedAt: data.recordedAt,
            sessionId,
            practicumId,
          });
        });
        onData(records);
      },
      (error) => {
        if (onError) onError(new Error(getHumanReadableErrorMessage(error)));
      }
    );
  } catch (err: any) {
    if (onError) onError(new Error(getHumanReadableErrorMessage(err)));
    return () => {};
  }
}

/**
 * FR-15 & FR-16: Sinkronisasi real-time riwayat kehadiran praktikan lintas sesi
 * Menggunakan collection group query 'attendance'
 */
export function subscribeUserAttendanceHistory(
  praktikanId: string,
  onData: (records: AttendanceDoc[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const q = query(collectionGroup(db, 'attendance'), where('praktikanId', '==', praktikanId));
    return onSnapshot(
      q,
      (snapshot) => {
        const records: AttendanceDoc[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Ekstrak session ID dari path jika perlu
          const segments = docSnap.ref.path.split('/');
          const pid = segments[1];
          const sid = segments[3];

          records.push({
            id: docSnap.id,
            praktikanId: data.praktikanId,
            praktikanName: data.praktikanName || '',
            praktikanNim: data.praktikanNim || '',
            status: data.status || 'present',
            recordedAt: data.recordedAt,
            sessionId: sid,
            practicumId: pid,
          });
        });
        onData(records);
      },
      (error) => {
        if (onError) onError(new Error(getHumanReadableErrorMessage(error)));
      }
    );
  } catch (err: any) {
    if (onError) onError(new Error(getHumanReadableErrorMessage(err)));
    return () => {};
  }
}

