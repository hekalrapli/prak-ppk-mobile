// src/services/laboratoryService.ts
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';

import type { Session } from '../types/attendance';
import type { Laboratory } from '../types/location';
import { getHumanReadableErrorMessage } from './errorHandler';
import { db } from './firebase';

/**
 * FR-P1-02 / FR-P1-03: pembacaan data laboratorium.
 *
 * Data ditulis oleh FR-P2-03 (CRUD asisten) ke koleksi `laboratorium`. Kontrak
 * README memakai field bahasa Indonesia (`nama`, `gedung`, `radius_meter`),
 * sedangkan kode aplikasi memakai camelCase; mapper menerima keduanya agar
 * aplikasi tidak pecah bila salah satu penulis memakai konvensi berbeda.
 *
 * Referensi laboratorium yang dipakai untuk presensi:
 *   1. `sessions/{sid}.labId` (paling akurat, dipakai setelah seed baru),
 *   2. pencocokan nama ruang sesi dengan nama laboratorium (data lama).
 */
export function mapLaboratory(id: string, data: DocumentData): Laboratory | null {
  const latitude = Number(data.latitude ?? data.lat);
  const longitude = Number(data.longitude ?? data.lng ?? data.lon);
  const radiusRaw = Number(data.radius_meter ?? data.radiusMeter ?? data.radius);
  const name = String(data.nama ?? data.name ?? '').trim();

  const validCoordinate =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (!validCoordinate) {
    // Dokumen tanpa koordinat valid tidak dapat dipakai untuk geofence.
    return null;
  }

  return {
    id,
    name: name || 'Laboratorium',
    building: String(data.gedung ?? data.building ?? '').trim(),
    latitude,
    longitude,
    radiusMeter: Number.isFinite(radiusRaw) && radiusRaw > 0 ? radiusRaw : 0,
  };
}

/** Sinkronisasi real-time seluruh laboratorium (dipakai peta dan presence). */
export function subscribeLaboratories(
  onData: (laboratories: Laboratory[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    return onSnapshot(
      collection(db, 'laboratorium'),
      (snapshot) => {
        const laboratories: Laboratory[] = [];
        snapshot.forEach((docSnap) => {
          const laboratory = mapLaboratory(docSnap.id, docSnap.data());
          if (laboratory) laboratories.push(laboratory);
        });
        onData(laboratories.sort((a, b) => a.name.localeCompare(b.name)));
      },
      (error) => onError?.(new Error(getHumanReadableErrorMessage(error)))
    );
  } catch (error) {
    onError?.(new Error(getHumanReadableErrorMessage(error)));
    return () => {};
  }
}

/** Sinkronisasi satu laboratorium; null bila dokumen tidak ada/tidak valid. */
export function subscribeLaboratory(
  laboratoryId: string,
  onData: (laboratory: Laboratory | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    return onSnapshot(
      doc(db, 'laboratorium', laboratoryId),
      (snapshot) => {
        onData(snapshot.exists() ? mapLaboratory(snapshot.id, snapshot.data()) : null);
      },
      (error) => onError?.(new Error(getHumanReadableErrorMessage(error)))
    );
  } catch (error) {
    onError?.(new Error(getHumanReadableErrorMessage(error)));
    return () => {};
  }
}

/** Pembacaan sekali jalan (dipakai saat validasi sebelum menulis presensi). */
export async function getLaboratory(laboratoryId: string): Promise<Laboratory | null> {
  try {
    const snapshot = await getDoc(doc(db, 'laboratorium', laboratoryId));
    if (!snapshot.exists()) return null;
    return mapLaboratory(snapshot.id, snapshot.data());
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

const GENERIC_TOKENS = new Set(['lab', 'laboratorium', 'ruang', 'gedung', 'lantai']);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((token) => token.length > 0 && !GENERIC_TOKENS.has(token));
}

function matchScore(laboratory: Laboratory, session: Session): number {
  const roomTokens = tokenize(session.room);
  if (roomTokens.length === 0) return 0;

  const labTokens = new Set([...tokenize(laboratory.name), ...tokenize(laboratory.building)]);
  return roomTokens.reduce((score, token) => (labTokens.has(token) ? score + 1 : score), 0);
}

/**
 * Menentukan laboratorium untuk sebuah sesi.
 * `labId` eksplisit selalu menang; bila belum ada (data seed lama), nama ruang
 * dicocokkan dengan nama laboratorium berdasarkan kata kunci.
 */
export function findLaboratoryForSession(
  laboratories: Laboratory[],
  session: Session
): Laboratory | null {
  if (session.labId) {
    const byId = laboratories.find((laboratory) => laboratory.id === session.labId);
    if (byId) return byId;
  }

  let best: Laboratory | null = null;
  let bestScore = 0;

  for (const laboratory of laboratories) {
    const score = matchScore(laboratory, session);
    if (score > bestScore) {
      best = laboratory;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : null;
}
