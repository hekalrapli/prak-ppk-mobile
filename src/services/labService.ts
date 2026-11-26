// src/services/labService.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import type { FirestoreTimestamp, Laboratory } from '../types/attendance';
import { getHumanReadableErrorMessage } from './errorHandler';
import { auth, db } from './firebase';

type DataHandler<T> = (data: T) => void;
type ErrorHandler = (message: string) => void;

export const LABORATORY_RADIUS_MIN = 1;
export const LABORATORY_RADIUS_MAX = 1000;
export const LABORATORY_GRACE_PERIOD_MIN = 0;
export const LABORATORY_GRACE_PERIOD_MAX = 120;
export const LABORATORY_GRACE_PERIOD_DEFAULT = 15;
export const LABORATORY_FINE_DEFAULT = 0;

const DECIMAL_NUMBER_REGEX = /^[+-]?(\d+(\.\d+)?|\.\d+)$/;
const INTEGER_NUMBER_REGEX = /^\d+$/;

export interface LaboratoryFormInput {
  nama: string;
  gedung: string;
  courseName?: string;
  latitude: string;
  longitude: string;
  radius_meter: string;
  grace_period_minutes?: string;
  late_fine_amount?: string;
}

export interface ParsedLaboratoryInput {
  nama: string;
  gedung: string;
  courseName: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
  grace_period_minutes: number;
  late_fine_amount: number;
}

export type LaboratoryFieldKey = keyof LaboratoryFormInput;
export type LaboratoryValidationErrors = Partial<Record<LaboratoryFieldKey, string>>;

/**
 * Format angka Rupiah secara deterministik tanpa bergantung pada dukungan locale Hermes/Web.
 */
export function formatRupiah(amount: number): string {
  const safe = Math.max(0, Math.trunc(Number.isFinite(amount) ? amount : 0));
  return `Rp ${safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/**
 * Mengurai string bilangan bulat non-negatif.
 * Mengembalikan null bila kosong, negatif, desimal, atau tidak valid.
 */
export function parseIntegerInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || !INTEGER_NUMBER_REGEX.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) {
    return null;
  }

  return parsed === 0 ? 0 : parsed;
}

/**
 * Mengurai string angka desimal dengan menerima titik maupun koma sebagai pemisah desimal.
 * Mengembalikan null bila input kosong atau bukan angka yang valid.
 */
export function parseDecimalInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/,/g, '.');
  if (!DECIMAL_NUMBER_REGEX.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed === 0 ? 0 : parsed;
}

export function validateLaboratoryInput(input: LaboratoryFormInput): {
  errors: LaboratoryValidationErrors;
  parsed: ParsedLaboratoryInput | null;
} {
  const errors: LaboratoryValidationErrors = {};
  const nama = input.nama.trim();
  const gedung = input.gedung.trim();
  const courseName = input.courseName !== undefined ? input.courseName.trim() : '';

  if (!nama) {
    errors.nama = 'Nama laboratorium wajib diisi.';
  } else if (nama.length > 100) {
    errors.nama = 'Nama laboratorium maksimal 100 karakter.';
  }

  if (gedung.length > 100) {
    errors.gedung = 'Keterangan gedung/lantai maksimal 100 karakter.';
  }

  if (input.courseName !== undefined) {
    if (!courseName) {
      errors.courseName = 'Mata kuliah wajib diisi.';
    } else if (courseName.length > 100) {
      errors.courseName = 'Mata kuliah maksimal 100 karakter.';
    }
  }

  const latitude = parseDecimalInput(input.latitude);
  if (!input.latitude.trim()) {
    errors.latitude = 'Latitude wajib diisi.';
  } else if (latitude === null) {
    errors.latitude = 'Latitude harus berupa angka desimal yang valid.';
  } else if (latitude < -90 || latitude > 90) {
    errors.latitude = 'Latitude harus berada di antara -90 dan 90.';
  }

  const longitude = parseDecimalInput(input.longitude);
  if (!input.longitude.trim()) {
    errors.longitude = 'Longitude wajib diisi.';
  } else if (longitude === null) {
    errors.longitude = 'Longitude harus berupa angka desimal yang valid.';
  } else if (longitude < -180 || longitude > 180) {
    errors.longitude = 'Longitude harus berada di antara -180 dan 180.';
  }

  const radius = parseDecimalInput(input.radius_meter);
  if (!input.radius_meter.trim()) {
    errors.radius_meter = 'Radius presensi wajib diisi.';
  } else if (radius === null) {
    errors.radius_meter = 'Radius harus berupa angka yang valid (dalam meter).';
  } else if (radius < LABORATORY_RADIUS_MIN || radius > LABORATORY_RADIUS_MAX) {
    errors.radius_meter = `Radius harus antara ${LABORATORY_RADIUS_MIN} sampai ${LABORATORY_RADIUS_MAX} meter.`;
  }

  let gracePeriodMinutes = LABORATORY_GRACE_PERIOD_DEFAULT;
  if (input.grace_period_minutes !== undefined) {
    const parsedGrace = parseIntegerInput(input.grace_period_minutes);
    if (!input.grace_period_minutes.trim()) {
      errors.grace_period_minutes = 'Batasan keterlambatan wajib diisi.';
    } else if (parsedGrace === null) {
      errors.grace_period_minutes =
        'Batasan keterlambatan harus berupa bilangan bulat (menit).';
    } else if (
      parsedGrace < LABORATORY_GRACE_PERIOD_MIN ||
      parsedGrace > LABORATORY_GRACE_PERIOD_MAX
    ) {
      errors.grace_period_minutes = `Batasan keterlambatan harus antara ${LABORATORY_GRACE_PERIOD_MIN} sampai ${LABORATORY_GRACE_PERIOD_MAX} menit.`;
    } else {
      gracePeriodMinutes = parsedGrace;
    }
  }

  let lateFineAmount = LABORATORY_FINE_DEFAULT;
  if (input.late_fine_amount !== undefined) {
    const parsedFine = parseIntegerInput(input.late_fine_amount);
    if (!input.late_fine_amount.trim()) {
      errors.late_fine_amount = 'Nominal denda wajib diisi (isi 0 jika tanpa denda).';
    } else if (parsedFine === null || parsedFine < 0) {
      errors.late_fine_amount = 'Nominal denda harus berupa bilangan bulat >= 0.';
    } else {
      lateFineAmount = parsedFine;
    }
  }

  const hasErrors = Object.keys(errors).length > 0;
  if (hasErrors || latitude === null || longitude === null || radius === null) {
    return { errors, parsed: null };
  }

  return {
    errors,
    parsed: {
      nama,
      gedung,
      courseName,
      latitude,
      longitude,
      radius_meter: radius,
      grace_period_minutes: gracePeriodMinutes,
      late_fine_amount: lateFineAmount,
    },
  };
}

function parseUidArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function mapLaboratory(id: string, data: DocumentData): Laboratory {
  const rawLat = Number(data.latitude ?? data.lat);
  const rawLng = Number(data.longitude ?? data.lng ?? data.lon);
  const rawRadius = Number(data.radius_meter ?? data.radiusMeter ?? data.radius);
  const rawGrace = Number(
    data.grace_period_minutes ?? data.gracePeriodMinutes ?? LABORATORY_GRACE_PERIOD_DEFAULT
  );
  const rawFine = Number(
    data.late_fine_amount ?? data.lateFineAmount ?? LABORATORY_FINE_DEFAULT
  );
  const courseNameRaw = data.courseName ?? data.course_name;

  return {
    id,
    nama:
      typeof data.nama === 'string'
        ? data.nama
        : typeof data.name === 'string'
          ? data.name
          : '',
    gedung:
      typeof data.gedung === 'string'
        ? data.gedung
        : typeof data.building === 'string'
          ? data.building
          : '',
    courseName: typeof courseNameRaw === 'string' ? courseNameRaw : '',
    latitude: Number.isFinite(rawLat) ? rawLat : 0,
    longitude: Number.isFinite(rawLng) ? rawLng : 0,
    radius_meter: Number.isFinite(rawRadius) ? rawRadius : 0,
    grace_period_minutes:
      Number.isFinite(rawGrace) && rawGrace >= LABORATORY_GRACE_PERIOD_MIN
        ? Math.trunc(rawGrace)
        : LABORATORY_GRACE_PERIOD_DEFAULT,
    late_fine_amount:
      Number.isFinite(rawFine) && rawFine >= 0
        ? Math.trunc(rawFine)
        : LABORATORY_FINE_DEFAULT,
    managedByAslabId:
      typeof data.managedByAslabId === 'string' ? data.managedByAslabId : '',
    assistantIds: parseUidArray(data.assistantIds),
    studentIds: parseUidArray(data.studentIds),
    updated_at: (data.updated_at as FirestoreTimestamp | undefined) ?? null,
  };
}

/**
 * FR-P2-03: Listener real-time daftar laboratorium pada koleksi root `laboratorium`.
 */
export function subscribeLaboratories(
  onData: DataHandler<Laboratory[]>,
  onError?: ErrorHandler
): Unsubscribe {
  try {
    return onSnapshot(
      collection(db, 'laboratorium'),
      (snapshot) => {
        const labs = snapshot.docs
          .map((docSnap) => mapLaboratory(docSnap.id, docSnap.data()))
          .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
        onData(labs);
      },
      (error) => onError?.(getHumanReadableErrorMessage(error))
    );
  } catch (error) {
    onError?.(getHumanReadableErrorMessage(error));
    return () => {};
  }
}

export function subscribeLaboratory(
  labId: string,
  onData: (lab: Laboratory | null) => void,
  onError?: ErrorHandler
): Unsubscribe {
  try {
    return onSnapshot(
      doc(db, 'laboratorium', labId),
      (snapshot) => {
        onData(snapshot.exists() ? mapLaboratory(snapshot.id, snapshot.data()) : null);
      },
      (error) => onError?.(getHumanReadableErrorMessage(error))
    );
  } catch (error) {
    onError?.(getHumanReadableErrorMessage(error));
    return () => {};
  }
}

function getFirstValidationError(errors: LaboratoryValidationErrors): string | undefined {
  return (
    errors.courseName ??
    errors.nama ??
    errors.gedung ??
    errors.latitude ??
    errors.longitude ??
    errors.radius_meter ??
    errors.grace_period_minutes ??
    errors.late_fine_amount
  );
}

export async function createLaboratory(
  input: LaboratoryFormInput,
  options?: { managedByAslabId?: string }
): Promise<string> {
  const { errors, parsed } = validateLaboratoryInput(input);
  const firstError = getFirstValidationError(errors);
  if (firstError || !parsed) {
    throw new Error(firstError ?? 'Data lokasi laboratorium tidak valid.');
  }

  if (!parsed.courseName) {
    throw new Error('Mata kuliah wajib diisi.');
  }

  const managedByAslabId =
    options?.managedByAslabId?.trim() || auth.currentUser?.uid || '';
  if (!managedByAslabId) {
    throw new Error('Sesi aslab tidak valid. Silakan masuk ulang.');
  }

  try {
    const docRef = await addDoc(collection(db, 'laboratorium'), {
      nama: parsed.nama,
      gedung: parsed.gedung,
      courseName: parsed.courseName,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      radius_meter: parsed.radius_meter,
      grace_period_minutes: parsed.grace_period_minutes,
      late_fine_amount: parsed.late_fine_amount,
      managedByAslabId,
      assistantIds: [],
      studentIds: [],
      updated_at: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

export async function updateLaboratory(
  labId: string,
  input: LaboratoryFormInput,
  options?: { existing?: Laboratory; managedByAslabId?: string }
): Promise<void> {
  const { errors, parsed } = validateLaboratoryInput(input);
  const firstError = getFirstValidationError(errors);
  if (firstError || !parsed) {
    throw new Error(firstError ?? 'Data lokasi laboratorium tidak valid.');
  }

  if (!parsed.courseName) {
    throw new Error('Mata kuliah wajib diisi.');
  }

  try {
    const docRef = doc(db, 'laboratorium', labId);
    let existing = options?.existing;
    if (!existing) {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        existing = mapLaboratory(snap.id, snap.data());
      }
    }

    const managedByAslabId =
      existing?.managedByAslabId?.trim() ||
      options?.managedByAslabId?.trim() ||
      auth.currentUser?.uid ||
      '';
    if (!managedByAslabId) {
      throw new Error('Sesi aslab tidak valid. Silakan masuk ulang.');
    }

    await updateDoc(docRef, {
      nama: parsed.nama,
      gedung: parsed.gedung,
      courseName: parsed.courseName,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      radius_meter: parsed.radius_meter,
      grace_period_minutes: parsed.grace_period_minutes,
      late_fine_amount: parsed.late_fine_amount,
      managedByAslabId,
      assistantIds: existing?.assistantIds ?? [],
      studentIds: existing?.studentIds ?? [],
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

export async function deleteLaboratory(labId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'laboratorium', labId));
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * Menghitung jumlah sesi pada praktikum yang diampu oleh asisten ini (`assistantId`)
 * yang memiliki field `lab_id == labId`.
 *
 * Batasan Security Rules: asisten hanya boleh membaca praktikum & sesi yang ia ampu
 * (tidak memakai aturan collectionGroup lintas asisten), sehingga sesi milik asisten lain
 * tidak diperiksa dan `lab_id` pada sesi tersebut dapat menggantung bila lab dihapus.
 */
export async function getLaboratoryOwnedSessionUsageCount(
  labId: string,
  assistantId: string
): Promise<number> {
  try {
    const practicumsSnap = await getDocs(
      query(collection(db, 'practicums'), where('assistantId', '==', assistantId))
    );

    if (practicumsSnap.empty) {
      return 0;
    }

    const counts = await Promise.all(
      practicumsSnap.docs.map(async (practicumDoc) => {
        const sessionsSnap = await getDocs(
          query(
            collection(db, 'practicums', practicumDoc.id, 'sessions'),
            where('lab_id', '==', labId)
          )
        );
        return sessionsSnap.size;
      })
    );

    return counts.reduce((sum, count) => sum + count, 0);
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}
