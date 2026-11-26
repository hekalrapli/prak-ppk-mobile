// src/services/attendanceService.ts
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  writeBatch,
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
  PunctualityStatus,
} from '../types/attendance';
import { getHumanReadableErrorMessage } from './errorHandler';
import { calculateLateness, getDeterministicFineId } from '../lib/lateness';
import { notifyFineCreated } from './pushDispatcher';

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
  const punctualityRaw = data.punctualityStatus ?? data.punctuality_status;
  const punctualityStatus: PunctualityStatus | undefined =
    punctualityRaw === 'on_time' || punctualityRaw === 'late'
      ? punctualityRaw
      : undefined;
  const lateMinutesRaw = data.lateMinutes ?? data.late_minutes;
  const lateMinutes =
    typeof lateMinutesRaw === 'number' ? lateMinutesRaw : undefined;
  const verificationMethod: AttendanceVerificationMethod | undefined =
    methodRaw === 'geofence' || methodRaw === 'qr' ? methodRaw : undefined;

  return {
    id,
    praktikanId: String(data.praktikanId ?? id),
    praktikanName: String(data.praktikanName ?? 'Praktikan'),
    praktikanNim: String(data.praktikanNim ?? ''),
    status: 'present',
    punctualityStatus,
    lateMinutes,
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
 * FR-14 & FR-S4-P2-03: Presensi Terintegrasi dengan Mesin Keterlambatan (Grace Period) & Denda.
 * Menyimpan presensi di practicums/{pid}/sessions/{sid}/attendance/{uid}.
 * ID dokumen = UID praktikan, mencegah duplikasi di level Firestore.
 *
 * Bila terlambat (punctualityStatus === 'late') dan nominal denda laboratorium/praktikum > 0,
 * membuat tepat satu tagihan denda di fines/{sessionId}_{praktikanId} secara atomik (writeBatch).
 */
export async function recordAttendance(params: {
  practicumId: string;
  sessionId: string;
  praktikanId: string;
  praktikanName: string;
  praktikanNim: string;
  geofence?: AttendanceGeofence;
  qrVerification?: AttendanceQrVerification;
}): Promise<{
  success: boolean;
  recordedAtDisplay: string;
  punctualityStatus: PunctualityStatus;
  lateMinutes: number;
  fineAmount?: number;
}> {
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
    // 1. FR-S4-P2-04: Cek apakah ada izin yang sudah disetujui (approved) pada sesi ini
    const leaveDocRef = doc(
      db,
      'practicums',
      practicumId,
      'sessions',
      sessionId,
      'leaveRequests',
      praktikanId
    );
    const leaveSnap = await getDoc(leaveDocRef);
    if (leaveSnap.exists() && leaveSnap.data()?.status === 'approved') {
      throw new Error(
        'Anda tidak dapat melakukan presensi karena pengajuan izin Anda untuk sesi ini telah disetujui (Excused Absence) — bebas denda keterlambatan.'
      );
    }

    // 2. Cek apakah dokumen presensi sudah ada
    const attendanceDocRef = doc(
      db,
      'practicums',
      practicumId,
      'sessions',
      sessionId,
      'attendance',
      praktikanId
    );
    const existingSnap = await getDoc(attendanceDocRef);
    if (existingSnap.exists()) {
      throw new Error('Kehadiran sudah dicatat sebelumnya untuk sesi ini.');
    }

    // 3. Ambil data sesi untuk tanggal, jam mulai, dan labId
    const sessionDocRef = doc(
      db,
      'practicums',
      practicumId,
      'sessions',
      sessionId
    );
    const sessionSnap = await getDoc(sessionDocRef);
    if (!sessionSnap.exists()) {
      throw new Error('Sesi praktikum tidak ditemukan.');
    }
    const sessionData = sessionSnap.data();

    // 4. Ambil nama praktikum
    const practicumDocRef = doc(db, 'practicums', practicumId);
    const practicumSnap = await getDoc(practicumDocRef);
    const practicumData = practicumSnap.exists() ? practicumSnap.data() : null;
    const practicumName = String(practicumData?.name ?? 'Praktikum');

    // 5. Ambil kebijakan laboratorium (grace period & nominal denda)
    const labId =
      sessionData.lab_id ?? sessionData.labId ?? practicumData?.labId ?? '';
    let gracePeriodMinutes = 15;
    let lateFineAmount = 0;
    let labName = String(sessionData.room ?? 'Laboratorium');

    if (labId) {
      try {
        const labSnap = await getDoc(doc(db, 'laboratorium', String(labId)));
        if (labSnap.exists()) {
          const labData = labSnap.data();
          labName = String(labData.nama ?? labData.name ?? labName);
          const gp = labData.grace_period_minutes ?? labData.gracePeriodMinutes;
          if (typeof gp === 'number' && Number.isFinite(gp) && gp >= 0) {
            gracePeriodMinutes = gp;
          }
          const fa = labData.late_fine_amount ?? labData.lateFineAmount;
          if (typeof fa === 'number' && Number.isFinite(fa) && fa >= 0) {
            lateFineAmount = fa;
          }
        }
      } catch {
        // Fallback ke default
      }
    }

    // Fallback bila diatur di tingkat praktikum
    if (
      typeof practicumData?.gracePeriodMinutes === 'number' &&
      practicumData.gracePeriodMinutes >= 0
    ) {
      gracePeriodMinutes = practicumData.gracePeriodMinutes;
    }
    if (
      typeof practicumData?.lateFineAmount === 'number' &&
      practicumData.lateFineAmount >= 0
    ) {
      lateFineAmount = practicumData.lateFineAmount;
    }

    // 6. Hitung status keterlambatan (FR-S4-P2-03)
    const now = new Date();
    const lateness = calculateLateness({
      sessionDate: String(sessionData.date ?? ''),
      startTime: String(sessionData.startTime ?? ''),
      recordedAt: now,
      gracePeriodMinutes,
      openedAt: sessionData.openedAt,
    });

    // 7. Simpan presensi & tagihan denda secara atomik (writeBatch)
    const batch = writeBatch(db);

    const payload: Record<string, unknown> = {
      praktikanId,
      praktikanName,
      praktikanNim,
      status: 'present',
      punctualityStatus: lateness.punctualityStatus,
      lateMinutes: lateness.lateMinutes,
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

    batch.set(attendanceDocRef, payload);

    const fineId = getDeterministicFineId(sessionId, praktikanId);
    let shouldCreateFine = false;

    if (lateness.punctualityStatus === 'late' && lateFineAmount > 0) {
      shouldCreateFine = true;
      const fineDocRef = doc(db, 'fines', fineId);
      const finePayload: Record<string, unknown> = {
        id: fineId,
        praktikanId,
        praktikanName,
        praktikanNim,
        practicumId,
        practicumName,
        sessionId,
        sessionDate: String(sessionData.date ?? ''),
        labId: String(labId),
        labName,
        attendanceId: praktikanId,
        lateMinutes: lateness.lateMinutes,
        gracePeriodMinutes,
        amount: lateFineAmount,
        status: 'unpaid',
        createdAt: serverTimestamp(),
      };
      batch.set(fineDocRef, finePayload);
    }

    await batch.commit();

    // 8. Kirim notifikasi push jika denda diterbitkan (non-blocking)
    if (shouldCreateFine) {
      void notifyFineCreated({
        praktikanId,
        practicumName,
        amount: lateFineAmount,
        lateMinutes: lateness.lateMinutes,
        sessionId,
        practicumId,
      }).catch(() => undefined);
    }

    const displayTime = formatTimestampToTime(now);
    return {
      success: true,
      recordedAtDisplay: displayTime,
      punctualityStatus: lateness.punctualityStatus,
      lateMinutes: lateness.lateMinutes,
      fineAmount: shouldCreateFine ? lateFineAmount : undefined,
    };
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

