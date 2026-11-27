import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';

import type { Laboratory } from '@/types/attendance';
import type { UserProfile } from '@/types/auth';
import { getHumanReadableErrorMessage } from './errorHandler';
import { auth, db } from './firebase';
import { mapLaboratory } from './labService';

export type TransferMemberKind = 'praktikan' | 'asprak';

export interface TransferLabMembersParams {
  kind: TransferMemberKind;
  sourceLabId: string;
  targetLabId: string;
  memberUids: string[];
}

export interface TransferLabMembersResult {
  movedCount: number;
  alreadyInTargetCount: number;
  syncedPracticumCount: number;
  sourceLabName: string;
  targetLabName: string;
}

const USER_FETCH_CONCURRENCY = 8;

function mapUserProfileDoc(uid: string, data: DocumentData): UserProfile | null {
  if (
    data.role !== 'praktikan' &&
    data.role !== 'asisten' &&
    data.role !== 'aslab'
  ) {
    return null;
  }

  return {
    uid,
    name: typeof data.name === 'string' ? data.name : '',
    identifier: typeof data.identifier === 'string' ? data.identifier : '',
    email: typeof data.email === 'string' ? data.email : '',
    role: data.role,
  };
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency = USER_FETCH_CONCURRENCY
): Promise<T[]> {
  if (tasks.length === 0) {
    return [];
  }

  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await tasks[index]();
    }
  }

  const workerCount = Math.min(concurrency, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

/**
 * Mengambil profil pengguna untuk daftar UID tertentu (untuk tampilan Detail Lab & Transfer).
 * Dokumen yang tidak ada atau gagal dibaca dilewati agar daftar tetap tampil.
 */
export async function fetchUsersByIds(
  uids: string[]
): Promise<Map<string, UserProfile>> {
  const uniqueUids = Array.from(
    new Set(uids.map((uid) => uid.trim()).filter(Boolean))
  );
  const profiles = new Map<string, UserProfile>();

  if (uniqueUids.length === 0) {
    return profiles;
  }

  await runWithConcurrency(
    uniqueUids.map((uid) => async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) {
          return;
        }
        const mapped = mapUserProfileDoc(snap.id, snap.data());
        if (mapped) {
          profiles.set(uid, mapped);
        }
      } catch {
        // Abaikan profil individual yang tidak dapat dibaca agar UI tetap jalan.
      }
    })
  );

  return profiles;
}

/**
 * Mengambil daftar akun terdaftar berperan `aslab` (limit <= 50 sesuai Security Rules)
 * untuk kebutuhan pengalihan penanggung jawab laboratorium.
 */
export async function fetchAslabUsers(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'users'), where('role', '==', 'aslab'), limit(50))
    );
    const list: UserProfile[] = [];
    snap.forEach((docSnap) => {
      const mapped = mapUserProfileDoc(docSnap.id, docSnap.data());
      if (mapped && mapped.role === 'aslab') {
        list.push(mapped);
      }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name, 'id'));
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

function buildLaboratoryContractPayload(
  lab: Laboratory,
  overrides: {
    managedByAslabId?: string;
    assistantIds?: string[];
    studentIds?: string[];
  }
) {
  const courseName = lab.courseName.trim();
  if (!courseName) {
    throw new Error(
      `Mata kuliah pada "${lab.nama}" belum diisi. Lengkapi terlebih dahulu melalui menu Ubah laboratorium.`
    );
  }

  const managedByAslabId =
    overrides.managedByAslabId?.trim() ||
    lab.managedByAslabId.trim() ||
    auth.currentUser?.uid ||
    '';
  if (!managedByAslabId) {
    throw new Error('Sesi aslab tidak valid. Silakan masuk ulang.');
  }

  return {
    nama: lab.nama,
    gedung: lab.gedung,
    courseName,
    latitude: lab.latitude,
    longitude: lab.longitude,
    radius_meter: lab.radius_meter,
    grace_period_minutes: lab.grace_period_minutes,
    late_fine_amount: lab.late_fine_amount,
    managedByAslabId,
    assistantIds: overrides.assistantIds ?? lab.assistantIds,
    studentIds: overrides.studentIds ?? lab.studentIds,
    updated_at: serverTimestamp(),
  };
}

/**
 * FR-S4-P1-05: Memindahkan praktikan (`studentIds`) atau asprak (`assistantIds`)
 * dari satu laboratorium ke laboratorium lainnya secara atomik via `writeBatch`.
 *
 * Jadwal dan sesi praktikum pada kedua laboratorium TIDAK dipindahkan.
 * Jika terdapat dokumen `practicums` tertaut (`labId`), daftar `studentIds` pada
 * praktikum terkait ikut disinkronkan dalam batch yang sama.
 */
export async function transferLabMembers(
  params: TransferLabMembersParams
): Promise<TransferLabMembersResult> {
  const sourceLabId = params.sourceLabId.trim();
  const targetLabId = params.targetLabId.trim();
  const uniqueMemberUids = Array.from(
    new Set(params.memberUids.map((uid) => uid.trim()).filter(Boolean))
  );

  if (!sourceLabId || !targetLabId) {
    throw new Error('Laboratorium asal dan tujuan wajib dipilih.');
  }
  if (sourceLabId === targetLabId) {
    throw new Error('Laboratorium tujuan tidak boleh sama dengan laboratorium asal.');
  }
  if (uniqueMemberUids.length === 0) {
    throw new Error(
      params.kind === 'praktikan'
        ? 'Pilih minimal satu praktikan untuk dipindahkan.'
        : 'Pilih minimal satu asprak untuk dipindahkan.'
    );
  }

  try {
    const sourceRef = doc(db, 'laboratorium', sourceLabId);
    const targetRef = doc(db, 'laboratorium', targetLabId);
    const [sourceSnap, targetSnap] = await Promise.all([
      getDoc(sourceRef),
      getDoc(targetRef),
    ]);

    if (!sourceSnap.exists()) {
      throw new Error('Laboratorium asal tidak ditemukan.');
    }
    if (!targetSnap.exists()) {
      throw new Error('Laboratorium tujuan tidak ditemukan.');
    }

    const sourceLab = mapLaboratory(sourceSnap.id, sourceSnap.data());
    const targetLab = mapLaboratory(targetSnap.id, targetSnap.data());

    const sourceList =
      params.kind === 'praktikan' ? sourceLab.studentIds : sourceLab.assistantIds;
    const targetList =
      params.kind === 'praktikan' ? targetLab.studentIds : targetLab.assistantIds;

    const sourceSet = new Set(sourceList);
    const movableUids = uniqueMemberUids.filter((uid) => sourceSet.has(uid));

    if (movableUids.length === 0) {
      throw new Error(
        params.kind === 'praktikan'
          ? 'Praktikan yang dipilih sudah tidak berada di laboratorium asal.'
          : 'Asprak yang dipilih sudah tidak berada di laboratorium asal.'
      );
    }

    const movableSet = new Set(movableUids);
    const nextSourceList = sourceList.filter((uid) => !movableSet.has(uid));

    const targetSet = new Set(targetList);
    const nextTargetList = [...targetList];
    let alreadyInTargetCount = 0;

    movableUids.forEach((uid) => {
      if (targetSet.has(uid)) {
        alreadyInTargetCount += 1;
      } else {
        targetSet.add(uid);
        nextTargetList.push(uid);
      }
    });

    const sourcePayload = buildLaboratoryContractPayload(sourceLab, {
      studentIds: params.kind === 'praktikan' ? nextSourceList : sourceLab.studentIds,
      assistantIds: params.kind === 'asprak' ? nextSourceList : sourceLab.assistantIds,
    });
    const targetPayload = buildLaboratoryContractPayload(targetLab, {
      studentIds: params.kind === 'praktikan' ? nextTargetList : targetLab.studentIds,
      assistantIds: params.kind === 'asprak' ? nextTargetList : targetLab.assistantIds,
    });

    const batch = writeBatch(db);
    batch.update(sourceRef, sourcePayload);
    batch.update(targetRef, targetPayload);

    // Sinkronisasi opsional ke `practicums` tertaut bila sudah memiliki `labId`
    // (hanya keanggotaan `studentIds`, tidak menyentuh subkoleksi `sessions`).
    let syncedPracticumCount = 0;
    if (params.kind === 'praktikan') {
      try {
        const [sourcePracs, targetPracs] = await Promise.all([
          getDocs(query(collection(db, 'practicums'), where('labId', '==', sourceLabId))),
          getDocs(query(collection(db, 'practicums'), where('labId', '==', targetLabId))),
        ]);

        sourcePracs.forEach((pracDoc) => {
          const data = pracDoc.data();
          const currentStudents = Array.isArray(data.studentIds)
            ? data.studentIds.filter((id: unknown): id is string => typeof id === 'string')
            : [];
          const updatedStudents = currentStudents.filter((id) => !movableSet.has(id));
          if (updatedStudents.length !== currentStudents.length) {
            batch.update(pracDoc.ref, { studentIds: updatedStudents });
            syncedPracticumCount += 1;
          }
        });

        targetPracs.forEach((pracDoc) => {
          const data = pracDoc.data();
          const currentStudents = Array.isArray(data.studentIds)
            ? data.studentIds.filter((id: unknown): id is string => typeof id === 'string')
            : [];
          const existingSet = new Set(currentStudents);
          const additions = movableUids.filter((id) => !existingSet.has(id));
          if (additions.length > 0) {
            batch.update(pracDoc.ref, {
              studentIds: [...currentStudents, ...additions],
            });
            syncedPracticumCount += 1;
          }
        });
      } catch {
        // Bila Rules `practicums` belum di-publish untuk aslab, tetap commit transfer lab.
      }
    }

    await batch.commit();

    return {
      movedCount: movableUids.length,
      alreadyInTargetCount,
      syncedPracticumCount,
      sourceLabName: sourceLab.nama,
      targetLabName: targetLab.nama,
    };
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}

/**
 * FR-S4-P1-05: Mengalihkan penanggung jawab Aslab (`managedByAslabId`) pada suatu
 * laboratorium ke akun Aslab lain tanpa mengubah jadwal praktikum.
 */
export async function reassignLabManager(params: {
  labId: string;
  nextAslabUid: string;
}): Promise<{ labName: string }> {
  const labId = params.labId.trim();
  const nextAslabUid = params.nextAslabUid.trim();

  if (!labId || !nextAslabUid) {
    throw new Error('Laboratorium dan aslab pengganti wajib dipilih.');
  }

  try {
    const labRef = doc(db, 'laboratorium', labId);
    const [labSnap, aslabSnap] = await Promise.all([
      getDoc(labRef),
      getDoc(doc(db, 'users', nextAslabUid)),
    ]);

    if (!labSnap.exists()) {
      throw new Error('Laboratorium tidak ditemukan.');
    }
    if (!aslabSnap.exists() || aslabSnap.data()?.role !== 'aslab') {
      throw new Error('Akun tujuan bukan Asisten Laboratorium (Aslab) yang valid.');
    }

    const lab = mapLaboratory(labSnap.id, labSnap.data());
    if (lab.managedByAslabId === nextAslabUid) {
      throw new Error('Aslab tersebut sudah menjadi penanggung jawab laboratorium ini.');
    }

    const payload = buildLaboratoryContractPayload(lab, {
      managedByAslabId: nextAslabUid,
    });
    await updateDoc(labRef, payload);

    return { labName: lab.nama };
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }
}
