// src/services/scheduleService.ts
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  type DocumentData,
  type Query,
  type Unsubscribe,
} from 'firebase/firestore';

import type { Practicum, Session, SessionStatus } from '../types/attendance';
import { getHumanReadableErrorMessage } from './errorHandler';
import { db } from './firebase';

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

  return {
    id,
    practicumId,
    date: typeof data.date === 'string' ? data.date : '',
    startTime: typeof data.startTime === 'string' ? data.startTime : '',
    endTime: typeof data.endTime === 'string' ? data.endTime : '',
    room: typeof data.room === 'string' ? data.room : '',
    status,
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
