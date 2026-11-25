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
import {
  AttendanceDoc,
  AttendanceGeofence,
  AttendanceQrVerification,
  AttendanceVerificationMethod,
  FirestoreTimestamp,
} from '../types/attendance';
import { getHumanReadableErrorMessage } from './errorHandler';

/**
 * Format server timestamp atau Date menjadi format HH:mm WIB
 */
export function formatTimestampToTime(ts: unknown): string {
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
  } else if (
    typeof ts === 'object' &&
    'toDate' in ts &&
    typeof (ts as { toDate?: unknown }).toDate === 'function'
  ) {
    date = (ts as { toDate: () => Date }).toDate();
  } else if (
    typeof ts === 'object' &&
    'seconds' in ts &&
    typeof (ts as { seconds?: unknown }).seconds === 'number'
  ) {
    date = new Date((ts as { seconds: number }).seconds * 1000);
  } else {
    return '--:--';
  }

  if (isNaN(date.getTime())) return '--:--';

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function parseTimestampValue(value: unknown): FirestoreTimestamp {
  if (
    value === null ||
    value === undefined ||
    value instanceof Timestamp ||
    value instanceof Date ||
    typeof value === 'number' ||
    typeof value === 'string'
  ) {
    return value ?? null;
  }
  if (typeof value === 'object') {
    if ('toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
      return value as Timestamp;
    }
    if ('seconds' in value && typeof (value as { seconds?: unknown }).seconds === 'number') {
      return value as { seconds: number; nanoseconds?: number };
    }
  }
  return null;
}

/**
 * Mengubah Timestamp Firestore, Date, angka, atau string menjadi epoch ms
 * agar daftar riwayat dapat diurutkan dengan benar.
 */
export function timestampToMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis === 'function') {
      return (toMillis as () => number).call(value);
    }
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = (value as { seconds?: unknown }).seconds;
    if (typeof seconds === 'number') return seconds * 1000;
  }
  return 0;
}

function mapAttendanceDoc(
  id: string,
  data: Record<string, unknown>,
  sessionId: string,
  practicumId: string
): AttendanceDoc {
  const distanceRaw = data.distance_meter ?? data.distanceMeter;
  const latRaw = data.device_lat ?? data.deviceLat;
  const lngRaw = data.device_lng ?? data.deviceLng;
  const verifiedRaw = data.is_location_verified ?? data.isLocationVerified;
  const methodRaw = data.verification_method ?? data.verificationMethod;
  const qrTokenRaw = data.qr_token ?? data.qrToken;
  const verificationMethod: AttendanceVerificationMethod | undefined =
    methodRaw === 'geofence' || methodRaw === 'qr' ? methodRaw : undefined;

  return {
    id,
    praktikanId: String(data.praktikanId ?? id),
    praktikanName: String(data.praktikanName ?? 'Praktikan'),
    praktikanNim: String(data.praktikanNim ?? ''),
    status: 'present',
    recordedAt: parseTimestampValue(data.recordedAt),
    sessionId,
    practicumId,
    verificationMethod,
    qrToken: typeof qrTokenRaw === 'string' ? qrTokenRaw : undefined,
    distanceMeter: typeof distanceRaw === 'number' ? distanceRaw : undefined,
    deviceLat: typeof latRaw === 'number' ? latRaw : undefined,
    deviceLng: typeof lngRaw === 'number' ? lngRaw : undefined,
    isLocationVerified: typeof verifiedRaw === 'boolean' ? verifiedRaw : undefined,
  };
}

/**
 * FR-14: Presensi Terintegrasi
 * Menyimpan presensi di practicums/{pid}/sessions/{sid}/attendance/{uid}
 * ID dokumen = UID praktikan, mencegah duplikasi di level Firestore.
 *
 * FR-P1-02: bila `geofence` dikirim, jarak dan koordinat perangkat ikut
 * disimpan sebagai jejak audit. Perhitungan radius dilakukan di klien
 * (Haversine) dan tidak dapat diverifikasi ulang oleh Security Rules.
 *
 * FR-P1-05: bila `qrVerification` dikirim, `verification_method: 'qr'` dan
 * `qr_token` divalidasi langsung oleh Security Rules terhadap `qr_token/current`.
 */
export async function recordAttendance(params: {
  practicumId: string;
  sessionId: string;
  praktikanId: string;
  praktikanName: string;
  praktikanNim: string;
  geofence?: AttendanceGeofence;
  qrVerification?: AttendanceQrVerification;
}): Promise<{ success: boolean; recordedAtDisplay: string }> {
  const {
    practicumId,
    sessionId,
    praktikanId,
    praktikanName,
    praktikanNim,
    geofence,
    qrVerification,
  } = params;

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
    const payload: Record<string, unknown> = {
      praktikanId,
      praktikanName,
      praktikanNim,
      status: 'present',
      recordedAt: serverTimestamp(),
    };

    if (qrVerification) {
      payload.verification_method = 'qr';
      payload.qr_token = qrVerification.token;
    } else if (geofence) {
      payload.distance_meter = geofence.distanceMeter;
      payload.device_lat = geofence.deviceLat;
      payload.device_lng = geofence.deviceLng;
      payload.is_location_verified = geofence.isLocationVerified;
    }

    await setDoc(attendanceDocRef, payload);

    const displayTime = formatTimestampToTime(now);
    return { success: true, recordedAtDisplay: displayTime };
  } catch (error: any) {
    const code = typeof error?.code === 'string' ? error.code : '';
    const msg = typeof error?.message === 'string' ? error.message : '';
    if (
      qrVerification &&
      (code.includes('permission-denied') || msg.includes('permission-denied'))
    ) {
      throw new Error(
        'Kode QR kedaluwarsa, tidak cocok, atau sesi sudah ditutup. Pindai ulang QR terbaru dari asisten.'
      );
    }
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
          records.push(
            mapAttendanceDoc(docSnap.id, docSnap.data(), sessionId, practicumId)
          );
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
 * FR-14 & FR-15: listener dokumen presensi milik praktikan sendiri.
 * Praktikan hanya diizinkan membaca dokumennya sendiri oleh Security Rules,
 * sehingga query koleksi (tanpa filter kepemilikan) tidak dapat dipakai.
 */
export function subscribeOwnAttendance(
  practicumId: string,
  sessionId: string,
  praktikanId: string,
  onData: (record: AttendanceDoc | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    const docRef = doc(
      db,
      'practicums',
      practicumId,
      'sessions',
      sessionId,
      'attendance',
      praktikanId
    );

    return onSnapshot(
      docRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          onData(null);
          return;
        }
        onData(mapAttendanceDoc(docSnap.id, docSnap.data(), sessionId, practicumId));
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

          records.push(mapAttendanceDoc(docSnap.id, data, sid, pid));
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

