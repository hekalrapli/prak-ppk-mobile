// src/services/scheduleService.ts
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Query,
  type Unsubscribe,
} from 'firebase/firestore';

import type { Practicum, Session, SessionStatus } from '../types/attendance';
import type { UserProfile } from '../types/auth';
import { getHumanReadableErrorMessage } from './errorHandler';
import { auth, db } from './firebase';
import {
  notifyScheduleModified,
  notifySessionOpened,
} from './pushDispatcher';

type DataHandler<T> = (data: T) => void;
type ErrorHandler = (message: string) => void;

function currentClockTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function mapPracticum(id: string, data: DocumentData): Practicum {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    className: typeof data.className === 'string' ? data.className : '',
    assistantId: typeof data.assistantId === 'string' ? data.assistantId : '',
    assistantName: typeof data.assistantName === 'string' ? data.assistantName : undefined,
    studentIds: Array.isArray(data.studentIds)
      ? data.studentIds.filter((value: unknown): value is string => typeof value === 'string')
      : [],
  };
}

export function mapSession(
  practicumId: string,
  id: string,
  data: DocumentData
): Session {
  const status: SessionStatus =
    data.status === 'open' || data.status === 'closed' ? data.status : 'upcoming';

  // Kontrak Sprint 3 memakai `lab_id`; aplikasi menulis `labId`. Keduanya dibaca.
  const labId =
    typeof data.labId === 'string'
      ? data.labId
      : typeof data.lab_id === 'string'
        ? data.lab_id
        : undefined;

  return {
    id,
    practicumId,
    date: typeof data.date === 'string' ? data.date : '',
    startTime: typeof data.startTime === 'string' ? data.startTime : '',
    endTime: typeof data.endTime === 'string' ? data.endTime : '',
    room: typeof data.room === 'string' ? data.room : '',
    lab_id:
      typeof data.lab_id === 'string' && data.lab_id.trim().length > 0
        ? data.lab_id.trim()
        : undefined,
    status,
    labId,
    openedAt: typeof data.openedAt === 'string' ? data.openedAt : undefined,
    closedAt: typeof data.closedAt === 'string' ? data.closedAt : undefined,
  };
}

function subscribePracticumQuery(
  target: Query<DocumentData>,
  onData: DataHandler<Practicum[]>,
  onError?: ErrorHandler
): Unsubscribe {
  try {
    return onSnapshot(
      target,
      (snapshot) => {
        onData(snapshot.docs.map((docSnap) => mapPracticum(docSnap.id, docSnap.data())));
      },
      (error) => onError?.(getHumanReadableErrorMessage(error))
    );
  } catch (error) {
    onError?.(getHumanReadableErrorMessage(error));
    return () => {};
  }
}

/**
 * FR-13: asisten hanya melihat praktikum yang ia ampu
 * (practicums.assistantId == uid). Praktikum milik asisten lain tidak pernah
 * dikirim ke perangkat ini, bukan sekadar disembunyikan di UI.
 */
export function subscribeAsistenPracticums(
  uid: string,
  onData: DataHandler<Practicum[]>,
  onError?: ErrorHandler
): Unsubscribe {
  return subscribePracticumQuery(
    query(collection(db, 'practicums'), where('assistantId', '==', uid)),
    onData,
    onError
  );
}

/**
 * FR-13: praktikan hanya melihat praktikum tempat ia terdaftar sebagai peserta.
 */
export function subscribePraktikanPracticums(
  uid: string,
  onData: DataHandler<Practicum[]>,
  onError?: ErrorHandler
): Unsubscribe {
  return subscribePracticumQuery(
    query(collection(db, 'practicums'), where('studentIds', 'array-contains', uid)),
    onData,
    onError
  );
}

/**
 * FR-S4-P2-02: Sinkronisasi seluruh praktikum untuk Aslab Dashboard
 */
export function subscribeAllPracticums(
  onData: DataHandler<Practicum[]>,
  onError?: ErrorHandler
): Unsubscribe {
  return subscribePracticumQuery(
    collection(db, 'practicums'),
    onData,
    onError
  );
}

/**
 * FR-S4-P2-02: Sinkronisasi seluruh sesi lintas praktikum untuk Aslab Dashboard
 */
export function subscribeAllSessions(
  onData: DataHandler<Session[]>,
  onError?: ErrorHandler
): Unsubscribe {
  try {
    return onSnapshot(
      collectionGroup(db, 'sessions'),
      (snapshot) => {
        const sessions: Session[] = [];
        snapshot.forEach((docSnap) => {
          const pathSegments = docSnap.ref.path.split('/');
          const practicumId = pathSegments[1] || '';
          sessions.push(mapSession(practicumId, docSnap.id, docSnap.data()));
        });
        onData(sessions);
      },
      (error) => onError?.(getHumanReadableErrorMessage(error))
    );
  } catch (error) {
    onError?.(getHumanReadableErrorMessage(error));
    return () => {};
  }
}

/**
 * FR-15: sinkronisasi real-time daftar sesi untuk satu praktikum.
 */
export function subscribePracticumSessions(
  practicumId: string,
  onData: DataHandler<Session[]>,
  onError?: ErrorHandler
): Unsubscribe {
  try {
    return onSnapshot(
      collection(db, 'practicums', practicumId, 'sessions'),
      (snapshot) => {
        onData(
          snapshot.docs.map((docSnap) =>
            mapSession(practicumId, docSnap.id, docSnap.data())
          )
        );
      },
      (error) => onError?.(getHumanReadableErrorMessage(error))
    );
  } catch (error) {
    onError?.(getHumanReadableErrorMessage(error));
    return () => {};
  }
}

export function subscribePracticum(
  practicumId: string,
  onData: (practicum: Practicum | null) => void,
  onError?: ErrorHandler
): Unsubscribe {
  try {
    return onSnapshot(
      doc(db, 'practicums', practicumId),
      (snapshot) => {
        onData(snapshot.exists() ? mapPracticum(snapshot.id, snapshot.data()) : null);
      },
      (error) => onError?.(getHumanReadableErrorMessage(error))
    );
  } catch (error) {
    onError?.(getHumanReadableErrorMessage(error));
    return () => {};
  }
}

export function subscribeSession(
  practicumId: string,
  sessionId: string,
  onData: (session: Session | null) => void,
  onError?: ErrorHandler
): Unsubscribe {
  try {
    return onSnapshot(
      doc(db, 'practicums', practicumId, 'sessions', sessionId),
      (snapshot) => {
        onData(
          snapshot.exists() ? mapSession(practicumId, snapshot.id, snapshot.data()) : null
        );
      },
      (error) => onError?.(getHumanReadableErrorMessage(error))
    );
  } catch (error) {
    onError?.(getHumanReadableErrorMessage(error));
    return () => {};
  }
}

/**
 * FR-04: membuka sesi (upcoming -> open). Security Rules membatasi aksi ini
 * hanya untuk asisten pengampu dan hanya mengizinkan perubahan status +
 * openedAt, sehingga status di Firestore selalu menjadi sumber kebenaran.
 */
export async function openSession(practicumId: string, sessionId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'practicums', practicumId, 'sessions', sessionId), {
      status: 'open',
      openedAt: currentClockTime(),
    });
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }

  // FR-P2-02: Kirim notifikasi non-blocking setelah sesi berhasil dibuka.
  void notifySessionOpened(practicumId, sessionId).catch(() => undefined);
}

/**
 * FR-05: menutup sesi (open -> closed).
 */
export async function closeSession(practicumId: string, sessionId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'practicums', practicumId, 'sessions', sessionId), {
      status: 'closed',
      closedAt: currentClockTime(),
    });
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

const MAX_BATCH_OPERATIONS = 400;
const TIME_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface PracticumInput {
  name: string;
  className: string;
}

export interface SessionInput {
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  lab_id?: string;
}

export function validatePracticumInput(
  input: PracticumInput
): Partial<Record<keyof PracticumInput, string>> {
  const errors: Partial<Record<keyof PracticumInput, string>> = {};
  const name = input.name.trim();
  const className = input.className.trim();

  if (!name) {
    errors.name = 'Nama praktikum wajib diisi.';
  } else if (name.length > 100) {
    errors.name = 'Nama praktikum maksimal 100 karakter.';
  }

  if (!className) {
    errors.className = 'Kelas wajib diisi.';
  } else if (className.length > 30) {
    errors.className = 'Kelas maksimal 30 karakter.';
  }

  return errors;
}

export function validateSessionInput(
  input: SessionInput
): Partial<Record<keyof SessionInput, string>> {
  const errors: Partial<Record<keyof SessionInput, string>> = {};
  const date = input.date.trim();
  const startTime = input.startTime.trim();
  const endTime = input.endTime.trim();
  const room = input.room.trim();

  if (!date) {
    errors.date = 'Tanggal sesi wajib diisi.';
  } else if (date.length < 8 || date.length > 30) {
    errors.date = 'Tanggal sesi harus 8–30 karakter (contoh: Senin, 26 Okt 2026).';
  }

  if (!startTime) {
    errors.startTime = 'Jam mulai wajib diisi.';
  } else if (!TIME_24H_REGEX.test(startTime)) {
    errors.startTime = 'Format jam mulai harus HH:mm (contoh: 08:00).';
  }

  if (!endTime) {
    errors.endTime = 'Jam selesai wajib diisi.';
  } else if (!TIME_24H_REGEX.test(endTime)) {
    errors.endTime = 'Format jam selesai harus HH:mm (contoh: 09:40).';
  } else if (TIME_24H_REGEX.test(startTime) && endTime <= startTime) {
    errors.endTime = 'Jam selesai harus setelah jam mulai.';
  }

  if (!room) {
    errors.room = 'Ruang wajib diisi.';
  } else if (room.length > 60) {
    errors.room = 'Ruang maksimal 60 karakter.';
  }

  const labId = input.lab_id?.trim() ?? '';
  if (labId.length > 100) {
    errors.lab_id = 'ID laboratorium maksimal 100 karakter.';
  }

  return errors;
}

async function commitDeleteChunks(refs: DocumentReference[]): Promise<void> {
  for (let index = 0; index < refs.length; index += MAX_BATCH_OPERATIONS) {
    const chunk = refs.slice(index, index + MAX_BATCH_OPERATIONS);
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

async function collectSessionSubcollectionRefs(
  practicumId: string,
  sessionId: string
): Promise<DocumentReference[]> {
  const subcollections = ['attendance', 'leaveRequests', 'leaveClassifications'] as const;
  const snapshots = await Promise.all(
    subcollections.map((subName) =>
      getDocs(
        collection(db, 'practicums', practicumId, 'sessions', sessionId, subName)
      ).catch(() => null)
    )
  );

  const refs: DocumentReference[] = [];
  snapshots.forEach((snap) => {
    if (!snap) return;
    snap.forEach((docSnap) => refs.push(docSnap.ref));
  });
  return refs;
}

/**
 * FR-13: Menambah praktikum baru oleh asisten pengampu.
 */
export async function createPracticum(params: {
  name: string;
  className: string;
  assistantId: string;
  assistantName: string;
}): Promise<string> {
  const errors = validatePracticumInput(params);
  const firstError = errors.name ?? errors.className;
  if (firstError) {
    throw new Error(firstError);
  }

  try {
    const docRef = await addDoc(collection(db, 'practicums'), {
      name: params.name.trim(),
      className: params.className.trim(),
      assistantId: params.assistantId,
      assistantName: params.assistantName.trim(),
      studentIds: [],
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-13: Mengubah nama dan kelas praktikum oleh asisten pengampu.
 */
export async function updatePracticum(
  practicumId: string,
  params: PracticumInput
): Promise<void> {
  const errors = validatePracticumInput(params);
  const firstError = errors.name ?? errors.className;
  if (firstError) {
    throw new Error(firstError);
  }

  try {
    await updateDoc(doc(db, 'practicums', practicumId), {
      name: params.name.trim(),
      className: params.className.trim(),
    });
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-13: Menghitung jumlah sesi dan presensi di bawah praktikum sebelum dihapus.
 */
export async function getPracticumDeleteSummary(
  practicumId: string
): Promise<{ sessionCount: number; attendanceCount: number }> {
  try {
    const sessionsSnap = await getDocs(
      collection(db, 'practicums', practicumId, 'sessions')
    );
    const attendanceCounts = await Promise.all(
      sessionsSnap.docs.map(async (sessionDoc) => {
        const attSnap = await getDocs(
          collection(
            db,
            'practicums',
            practicumId,
            'sessions',
            sessionDoc.id,
            'attendance'
          )
        );
        return attSnap.size;
      })
    );

    return {
      sessionCount: sessionsSnap.size,
      attendanceCount: attendanceCounts.reduce((sum, count) => sum + count, 0),
    };
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-13: Menghapus praktikum beserta seluruh sesi dan subkoleksi di bawahnya
 * secara bertahap (maks. 400 operasi per batch).
 */
export async function deletePracticumCascade(practicumId: string): Promise<void> {
  try {
    const sessionsSnap = await getDocs(
      collection(db, 'practicums', practicumId, 'sessions')
    );

    const nestedSubcollectionRefs = (
      await Promise.all(
        sessionsSnap.docs.map((sessionDoc) =>
          collectSessionSubcollectionRefs(practicumId, sessionDoc.id)
        )
      )
    ).flat();

    if (nestedSubcollectionRefs.length > 0) {
      await commitDeleteChunks(nestedSubcollectionRefs).catch(() => undefined);
    }

    const sessionRefs = sessionsSnap.docs.map((sessionDoc) => sessionDoc.ref);
    if (sessionRefs.length > 0) {
      await commitDeleteChunks(sessionRefs);
    }

    await deleteDoc(doc(db, 'practicums', practicumId));
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

function mapUserProfile(id: string, data: DocumentData): UserProfile | null {
  if (data.role !== 'praktikan' && data.role !== 'asisten') {
    return null;
  }
  return {
    uid: id,
    name: typeof data.name === 'string' ? data.name : '',
    identifier: typeof data.identifier === 'string' ? data.identifier : '',
    email: typeof data.email === 'string' ? data.email : '',
    role: data.role,
  };
}

/**
 * FR-13: Mencari akun praktikan berdasarkan NIM (identifier) atau email.
 */
export async function searchPraktikanByNimOrEmail(
  keyword: string
): Promise<UserProfile[]> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const usersCol = collection(db, 'users');
    const q = trimmed.includes('@')
      ? query(usersCol, where('email', '==', trimmed.toLowerCase()))
      : query(usersCol, where('identifier', '==', trimmed));

    const snap = await getDocs(q);
    const results: UserProfile[] = [];

    snap.forEach((docSnap) => {
      const profile = mapUserProfile(docSnap.id, docSnap.data());
      if (profile && profile.role === 'praktikan') {
        results.push(profile);
      }
    });

    return results.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-13: Memuat daftar profil peserta praktikum dari array studentIds.
 */
export async function getUsersByIds(uids: string[]): Promise<UserProfile[]> {
  const uniqueIds = Array.from(new Set(uids.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return [];
  }

  try {
    const snapshots = await Promise.all(
      uniqueIds.map((uid) => getDoc(doc(db, 'users', uid)))
    );
    const profiles: UserProfile[] = [];

    snapshots.forEach((snap) => {
      if (!snap.exists()) return;
      const profile = mapUserProfile(snap.id, snap.data());
      if (profile) {
        profiles.push(profile);
      }
    });

    return profiles.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-13: Menambahkan praktikan ke daftar peserta praktikum (cegah duplikat).
 */
export async function addPracticumParticipant(
  practicumId: string,
  praktikanId: string
): Promise<void> {
  try {
    const practicumRef = doc(db, 'practicums', practicumId);
    const snap = await getDoc(practicumRef);
    if (!snap.exists()) {
      throw new Error('Praktikum tidak ditemukan.');
    }

    const studentIds = Array.isArray(snap.data().studentIds)
      ? (snap.data().studentIds as unknown[])
      : [];
    if (studentIds.includes(praktikanId)) {
      throw new Error('Praktikan ini sudah terdaftar sebagai peserta.');
    }

    await updateDoc(practicumRef, {
      studentIds: arrayUnion(praktikanId),
    });
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-13: Menghapus praktikan dari daftar peserta praktikum.
 */
export async function removePracticumParticipant(
  practicumId: string,
  praktikanId: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'practicums', practicumId), {
      studentIds: arrayRemove(praktikanId),
    });
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-13: Membuat sesi praktikum baru (selalu berstatus upcoming).
 */
export async function createSession(
  practicumId: string,
  params: SessionInput
): Promise<string> {
  const errors = validateSessionInput(params);
  const firstError =
    errors.date ?? errors.startTime ?? errors.endTime ?? errors.room ?? errors.lab_id;
  if (firstError) {
    throw new Error(firstError);
  }

  const labId = params.lab_id?.trim() ?? '';

  try {
    const payload: Record<string, unknown> = {
      date: params.date.trim(),
      startTime: params.startTime.trim(),
      endTime: params.endTime.trim(),
      room: params.room.trim(),
      status: 'upcoming',
    };
    if (labId) {
      payload.lab_id = labId;
    }

    const docRef = await addDoc(
      collection(db, 'practicums', practicumId, 'sessions'),
      payload
    );
    return docRef.id;
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-13: Mengubah jadwal sesi (tidak diizinkan bila sesi sudah closed).
 */
export async function updateSession(
  practicumId: string,
  sessionId: string,
  params: SessionInput
): Promise<void> {
  const errors = validateSessionInput(params);
  const firstError =
    errors.date ?? errors.startTime ?? errors.endTime ?? errors.room ?? errors.lab_id;
  if (firstError) {
    throw new Error(firstError);
  }

  const labId = params.lab_id?.trim() ?? '';

  try {
    const sessionRef = doc(db, 'practicums', practicumId, 'sessions', sessionId);
    const snap = await getDoc(sessionRef);
    if (!snap.exists()) {
      throw new Error('Sesi tidak ditemukan.');
    }
    if (snap.data().status === 'closed') {
      throw new Error('Sesi yang sudah ditutup tidak dapat diubah.');
    }

    const payload: Record<string, unknown> = {
      date: params.date.trim(),
      startTime: params.startTime.trim(),
      endTime: params.endTime.trim(),
      room: params.room.trim(),
    };
    if (labId) {
      payload.lab_id = labId;
    } else if ('lab_id' in snap.data()) {
      payload.lab_id = deleteField();
    }

    await updateDoc(sessionRef, payload);
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }

  // FR-P2-02: Kirim notifikasi non-blocking setelah perubahan jadwal tersimpan.
  void notifyScheduleModified(
    practicumId,
    sessionId,
    auth.currentUser?.uid
  ).catch(() => undefined);
}

/**
 * FR-13: Menghitung jumlah kehadiran pada satu sesi sebelum dihapus.
 */
export async function getSessionAttendanceCount(
  practicumId: string,
  sessionId: string
): Promise<number> {
  try {
    const snap = await getDocs(
      collection(db, 'practicums', practicumId, 'sessions', sessionId, 'attendance')
    );
    return snap.size;
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-13: Menghapus sesi beserta subkoleksinya.
 */
export async function deleteSessionCascade(
  practicumId: string,
  sessionId: string
): Promise<void> {
  try {
    const subRefs = await collectSessionSubcollectionRefs(practicumId, sessionId);
    if (subRefs.length > 0) {
      await commitDeleteChunks(subRefs).catch(() => undefined);
    }

    await deleteDoc(doc(db, 'practicums', practicumId, 'sessions', sessionId));
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}
