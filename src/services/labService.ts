// src/services/labService.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
import { db } from './firebase';

type DataHandler<T> = (data: T) => void;
type ErrorHandler = (message: string) => void;

export const LABORATORY_RADIUS_MAX = 1000;
const DECIMAL_NUMBER_REGEX = /^[+-]?(\d+(\.\d+)?|\.\d+)$/;

export interface LaboratoryFormInput {
  nama: string;
  gedung: string;
  latitude: string;
  longitude: string;
  radius_meter: string;
}

export interface ParsedLaboratoryInput {
  nama: string;
  gedung: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
}

export type LaboratoryFieldKey = keyof LaboratoryFormInput;
export type LaboratoryValidationErrors = Partial<Record<LaboratoryFieldKey, string>>;

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

  if (!nama) {
    errors.nama = 'Nama laboratorium wajib diisi.';
  } else if (nama.length > 100) {
    errors.nama = 'Nama laboratorium maksimal 100 karakter.';
  }

  if (gedung.length > 100) {
    errors.gedung = 'Keterangan gedung/lantai maksimal 100 karakter.';
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
  } else if (radius <= 0 || radius > LABORATORY_RADIUS_MAX) {
    errors.radius_meter = `Radius harus lebih dari 0 dan maksimal ${LABORATORY_RADIUS_MAX} meter.`;
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
      latitude,
      longitude,
      radius_meter: radius,
    },
  };
}

export function mapLaboratory(id: string, data: DocumentData): Laboratory {
  return {
    id,
    nama: typeof data.nama === 'string' ? data.nama : '',
    gedung: typeof data.gedung === 'string' ? data.gedung : '',
    latitude:
      typeof data.latitude === 'number' && Number.isFinite(data.latitude)
        ? data.latitude
        : 0,
    longitude:
      typeof data.longitude === 'number' && Number.isFinite(data.longitude)
        ? data.longitude
        : 0,
    radius_meter:
      typeof data.radius_meter === 'number' && Number.isFinite(data.radius_meter)
        ? data.radius_meter
        : 0,
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

export async function createLaboratory(input: LaboratoryFormInput): Promise<string> {
  const { errors, parsed } = validateLaboratoryInput(input);
  const firstError =
    errors.nama ??
    errors.gedung ??
    errors.latitude ??
    errors.longitude ??
    errors.radius_meter;
  if (firstError || !parsed) {
    throw new Error(firstError ?? 'Data lokasi laboratorium tidak valid.');
  }

  try {
    const docRef = await addDoc(collection(db, 'laboratorium'), {
      nama: parsed.nama,
      gedung: parsed.gedung,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      radius_meter: parsed.radius_meter,
      updated_at: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

export async function updateLaboratory(
  labId: string,
  input: LaboratoryFormInput
): Promise<void> {
  const { errors, parsed } = validateLaboratoryInput(input);
  const firstError =
    errors.nama ??
    errors.gedung ??
    errors.latitude ??
    errors.longitude ??
    errors.radius_meter;
  if (firstError || !parsed) {
    throw new Error(firstError ?? 'Data lokasi laboratorium tidak valid.');
  }

  try {
    await updateDoc(doc(db, 'laboratorium', labId), {
      nama: parsed.nama,
      gedung: parsed.gedung,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      radius_meter: parsed.radius_meter,
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
