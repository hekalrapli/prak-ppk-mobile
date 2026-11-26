import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';

import { validateLabRowData, validateMemberRowData } from '@/lib/bulk-parser';
import { getHumanReadableErrorMessage } from './errorHandler';
import { auth, db } from './firebase';
import { mapLaboratory, validateLaboratoryInput } from './labService';
import type {
  BulkLabRowData,
  BulkMemberRowData,
  BulkRowItem,
  Laboratory,
} from '@/types/attendance';
import type { UserProfile } from '@/types/auth';

export const BULK_WRITE_BATCH_LIMIT = 400;
const USER_LOOKUP_CONCURRENCY = 8;

export interface BulkCommitSummary {
  savedCount: number;
  skippedCount: number;
  failedCount: number;
  errorMessages: string[];
  savedRowIds: string[];
}

function hasRowErrors<T>(row: BulkRowItem<T>): boolean {
  return Object.values(row.errors).some((msg) => Boolean(msg));
}

/**
 * Memvalidasi seluruh baris Bulk Laboratorium terhadap aturan field & duplikasi nama
 * pada mata kuliah yang sama maupun duplikasi antar baris staging.
 */
export function validateBulkLabRows(
  rows: BulkRowItem<BulkLabRowData>[],
  courseName: string,
  existingLabs: Laboratory[]
): BulkRowItem<BulkLabRowData>[] {
  const normalizedCourse = courseName.trim().toLowerCase();
  const existingNames = new Set(
    existingLabs
      .filter((lab) => lab.courseName.trim().toLowerCase() === normalizedCourse)
      .map((lab) => lab.nama.trim().toLowerCase())
      .filter(Boolean)
  );

  const seenStagingNames = new Set<string>();

  return rows.map((row) => {
    const data: BulkLabRowData = {
      nama: row.data.nama.trim(),
      gedung: row.data.gedung.trim(),
      latitude: row.data.latitude.trim(),
      longitude: row.data.longitude.trim(),
      radius_meter: row.data.radius_meter.trim(),
      grace_period_minutes: row.data.grace_period_minutes.trim(),
      late_fine_amount: row.data.late_fine_amount.trim(),
    };

    const errors = validateLabRowData(data);
    const normalizedName = data.nama.toLowerCase();

    if (!errors.nama && normalizedName) {
      if (existingNames.has(normalizedName)) {
        errors.nama = `Laboratorium "${data.nama}" sudah ada untuk mata kuliah ini.`;
      } else if (row.decision !== 'denied') {
        if (seenStagingNames.has(normalizedName)) {
          errors.nama = `Duplikat nama "${data.nama}" pada daftar import ini.`;
        } else {
          seenStagingNames.add(normalizedName);
        }
      }
    }

    const valid = Object.keys(errors).length === 0;
    const nextDecision = !valid && row.decision === 'accepted' ? 'pending' : row.decision;

    return {
      ...row,
      data,
      errors,
      decision: nextDecision,
      statusNote: valid ? 'Siap diterima untuk mata kuliah ini' : undefined,
    };
  });
}

function mapMatchedUser(id: string, data: DocumentData): UserProfile | null {
  if (
    data.role !== 'praktikan' &&
    data.role !== 'asisten' &&
    data.role !== 'aslab'
  ) {
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

async function queryUserByField(
  role: 'praktikan' | 'asisten',
  field: 'email' | 'identifier',
  value: string
): Promise<UserProfile | null> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', role),
    where(field, '==', value),
    limit(5)
  );
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    const mapped = mapMatchedUser(docSnap.id, docSnap.data());
    if (mapped) {
      return mapped;
    }
  }
  return null;
}

async function runLimited<T>(
  tasks: (() => Promise<T>)[],
  concurrency = USER_LOOKUP_CONCURRENCY
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const idx = cursor;
      cursor += 1;
      results[idx] = await tasks[idx]();
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

/**
 * Memvalidasi baris Bulk Praktikan atau Bulk Asprak terhadap koleksi `users`
 * (cek keberadaan akun & kesesuaian role), duplikasi di lab tujuan, dan duplikasi antar baris.
 */
export async function validateBulkMemberRows(
  kind: 'praktikan' | 'asprak',
  rows: BulkRowItem<BulkMemberRowData>[],
  targetLab: Laboratory
): Promise<BulkRowItem<BulkMemberRowData>[]> {
  const targetRole: 'praktikan' | 'asisten' =
    kind === 'praktikan' ? 'praktikan' : 'asisten';
  const oppositeRole: 'praktikan' | 'asisten' =
    kind === 'praktikan' ? 'asisten' : 'praktikan';
  const idLabel = kind === 'praktikan' ? 'NIM' : 'NIP';
  const roleLabel = kind === 'praktikan' ? 'Praktikan' : 'Asprak (asisten)';
  const oppositeLabel = kind === 'praktikan' ? 'Asprak (asisten)' : 'Praktikan';

  const existingIds = new Set(
    kind === 'praktikan' ? targetLab.studentIds : targetLab.assistantIds
  );

  const normalizedRows = rows.map((row) => {
    const data: BulkMemberRowData = {
      identifier: row.data.identifier.trim(),
      email: row.data.email.trim().toLowerCase(),
      nama: row.data.nama.trim(),
    };
    const errors = validateMemberRowData(kind, data);
    return { row, data, errors };
  });

  const uniqueEmails = new Set<string>();
  const uniqueIdentifiers = new Set<string>();

  normalizedRows.forEach(({ data, errors }) => {
    if (data.email && !errors.email) uniqueEmails.add(data.email);
    if (data.identifier && !errors.identifier) uniqueIdentifiers.add(data.identifier);
  });

  const targetByEmail = new Map<string, UserProfile>();
  const targetById = new Map<string, UserProfile>();
  const oppositeByEmail = new Map<string, UserProfile>();
  const oppositeById = new Map<string, UserProfile>();

  try {
    const emailList = Array.from(uniqueEmails);
    const idList = Array.from(uniqueIdentifiers);

    await runLimited([
      ...emailList.map((email) => async () => {
        const user = await queryUserByField(targetRole, 'email', email);
        if (user) {
          targetByEmail.set(email, user);
        } else {
          const other = await queryUserByField(oppositeRole, 'email', email);
          if (other) oppositeByEmail.set(email, other);
        }
      }),
      ...idList.map((identifier) => async () => {
        const user = await queryUserByField(targetRole, 'identifier', identifier);
        if (user) {
          targetById.set(identifier, user);
        } else {
          const other = await queryUserByField(oppositeRole, 'identifier', identifier);
          if (other) oppositeById.set(identifier, other);
        }
      }),
    ]);
  } catch (error) {
    throw new Error(getHumanReadableErrorMessage(error));
  }

  const seenUids = new Set<string>();

  return normalizedRows.map(({ row, data, errors }) => {
    let matchedUserId: string | undefined;
    let statusNote: string | undefined;

    if (!errors.identifier && !errors.email) {
      const matchFromId = data.identifier ? targetById.get(data.identifier) : undefined;
      const matchFromEmail = data.email ? targetByEmail.get(data.email) : undefined;
      const wrongRoleFromId = data.identifier
        ? oppositeById.get(data.identifier)
        : undefined;
      const wrongRoleFromEmail = data.email
        ? oppositeByEmail.get(data.email)
        : undefined;

      if (matchFromId && matchFromEmail && matchFromId.uid !== matchFromEmail.uid) {
        errors.email = `${idLabel} dan email mengarah ke akun yang berbeda.`;
      } else if (wrongRoleFromId && !matchFromId) {
        errors.identifier = `Akun terdaftar sebagai ${oppositeLabel}, bukan ${roleLabel}.`;
      } else if (wrongRoleFromEmail && !matchFromEmail) {
        errors.email = `Akun terdaftar sebagai ${oppositeLabel}, bukan ${roleLabel}.`;
      } else {
        const matched = matchFromId ?? matchFromEmail;
        if (!matched) {
          const keyLabel =
            data.identifier && data.email
              ? `${idLabel} atau email`
              : data.identifier
                ? idLabel
                : 'email';
          errors.identifier = `Akun ${roleLabel} dengan ${keyLabel} tersebut belum terdaftar.`;
        } else if (
          data.email &&
          matched.email.toLowerCase() !== data.email &&
          !matchFromEmail
        ) {
          errors.email = `Email tidak cocok dengan akun pemilik ${idLabel} (${matched.email}).`;
        } else {
          matchedUserId = matched.uid;
          statusNote = `Akun cocok: ${matched.name} (${matched.identifier})`;

          if (existingIds.has(matched.uid)) {
            const dupField: keyof BulkMemberRowData = data.identifier
              ? 'identifier'
              : 'email';
            errors[dupField] = 'Sudah terdaftar di laboratorium tujuan.';
          } else if (row.decision !== 'denied') {
            if (seenUids.has(matched.uid)) {
              const dupField: keyof BulkMemberRowData = data.identifier
                ? 'identifier'
                : 'email';
              errors[dupField] = 'Duplikat akun pada daftar import ini.';
            } else {
              seenUids.add(matched.uid);
            }
          }
        }
      }
    }

    const valid = Object.keys(errors).length === 0 && Boolean(matchedUserId);
    const nextDecision =
      !valid && row.decision === 'accepted' ? 'pending' : row.decision;

    return {
      ...row,
      data,
      errors,
      matchedUserId,
      statusNote,
      decision: nextDecision,
    };
  });
}

/**
 * Menyimpan seluruh baris laboratorium berstatus `accepted` dan valid ke Firestore
 * menggunakan `writeBatch` (dipecah per 400 operasi). Baris `denied` / `pending` diabaikan.
 */
export async function commitBulkLabs(params: {
  courseName: string;
  rows: BulkRowItem<BulkLabRowData>[];
  managedByAslabId?: string;
}): Promise<BulkCommitSummary> {
  const courseName = params.courseName.trim();
  if (!courseName) {
    throw new Error('Mata kuliah wajib diisi sebelum menyimpan laboratorium.');
  }

  const managedByAslabId =
    params.managedByAslabId?.trim() || auth.currentUser?.uid || '';
  if (!managedByAslabId) {
    throw new Error('Sesi aslab tidak valid. Silakan masuk ulang.');
  }

  const acceptedRows = params.rows.filter(
    (row) => row.decision === 'accepted' && !hasRowErrors(row)
  );
  const skippedCount = params.rows.length - acceptedRows.length;

  if (acceptedRows.length === 0) {
    return {
      savedCount: 0,
      skippedCount,
      failedCount: 0,
      errorMessages: ['Tidak ada baris valid berstatus Diterima untuk disimpan.'],
      savedRowIds: [],
    };
  }

  let savedCount = 0;
  let failedCount = 0;
  const errorMessages: string[] = [];
  const savedRowIds: string[] = [];

  for (let i = 0; i < acceptedRows.length; i += BULK_WRITE_BATCH_LIMIT) {
    const chunk = acceptedRows.slice(i, i + BULK_WRITE_BATCH_LIMIT);
    const batch = writeBatch(db);
    const preparedIds: string[] = [];
    let chunkInvalid = false;

    for (const row of chunk) {
      const { parsed } = validateLaboratoryInput({
        nama: row.data.nama,
        gedung: row.data.gedung,
        courseName,
        latitude: row.data.latitude,
        longitude: row.data.longitude,
        radius_meter: row.data.radius_meter,
        grace_period_minutes: row.data.grace_period_minutes,
        late_fine_amount: row.data.late_fine_amount,
      });

      if (!parsed) {
        chunkInvalid = true;
        failedCount += chunk.length;
        errorMessages.push(
          `Baris #${row.rowNumber} (${row.data.nama || 'tanpa nama'}) tidak lolos validasi.`
        );
        break;
      }

      const ref = doc(collection(db, 'laboratorium'));
      batch.set(ref, {
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
      preparedIds.push(row.rowId);
    }

    if (chunkInvalid) {
      continue;
    }

    try {
      await batch.commit();
      savedCount += chunk.length;
      savedRowIds.push(...preparedIds);
    } catch (error) {
      failedCount += chunk.length;
      errorMessages.push(getHumanReadableErrorMessage(error));
    }
  }

  return {
    savedCount,
    skippedCount,
    failedCount,
    errorMessages,
    savedRowIds,
  };
}

/**
 * Menyimpan baris anggota (`praktikan` atau `asprak`) berstatus `accepted` dan valid
 * ke laboratorium tujuan menggunakan `writeBatch` Firestore.
 */
export async function commitBulkMembers(params: {
  kind: 'praktikan' | 'asprak';
  labId: string;
  rows: BulkRowItem<BulkMemberRowData>[];
}): Promise<BulkCommitSummary> {
  const acceptedRows = params.rows.filter(
    (row) =>
      row.decision === 'accepted' &&
      !hasRowErrors(row) &&
      Boolean(row.matchedUserId)
  );
  const skippedCount = params.rows.length - acceptedRows.length;

  if (acceptedRows.length === 0) {
    return {
      savedCount: 0,
      skippedCount,
      failedCount: 0,
      errorMessages: ['Tidak ada baris valid berstatus Diterima untuk disimpan.'],
      savedRowIds: [],
    };
  }

  try {
    const labRef = doc(db, 'laboratorium', params.labId);
    const snap = await getDoc(labRef);
    if (!snap.exists()) {
      throw new Error('Laboratorium tujuan tidak ditemukan.');
    }

    const lab = mapLaboratory(snap.id, snap.data());
    if (!lab.courseName.trim()) {
      throw new Error(
        'Lengkapi data mata kuliah laboratorium ini terlebih dahulu melalui menu Ubah laboratorium.'
      );
    }

    const managedByAslabId =
      lab.managedByAslabId.trim() || auth.currentUser?.uid || '';
    if (!managedByAslabId) {
      throw new Error('Sesi aslab tidak valid. Silakan masuk ulang.');
    }

    const currentList =
      params.kind === 'praktikan' ? [...lab.studentIds] : [...lab.assistantIds];
    const currentSet = new Set(currentList);
    const savedRowIds: string[] = [];
    let addedCount = 0;

    acceptedRows.forEach((row) => {
      const uid = row.matchedUserId;
      if (!uid) return;
      if (!currentSet.has(uid)) {
        currentSet.add(uid);
        currentList.push(uid);
        addedCount += 1;
      }
      savedRowIds.push(row.rowId);
    });

    if (addedCount > 0) {
      const batch = writeBatch(db);
      batch.update(labRef, {
        nama: lab.nama,
        gedung: lab.gedung,
        courseName: lab.courseName,
        latitude: lab.latitude,
        longitude: lab.longitude,
        radius_meter: lab.radius_meter,
        grace_period_minutes: lab.grace_period_minutes,
        late_fine_amount: lab.late_fine_amount,
        managedByAslabId,
        assistantIds: params.kind === 'asprak' ? currentList : lab.assistantIds,
        studentIds: params.kind === 'praktikan' ? currentList : lab.studentIds,
        updated_at: serverTimestamp(),
      });
      await batch.commit();
    }

    return {
      savedCount: addedCount,
      skippedCount,
      failedCount: 0,
      errorMessages: [],
      savedRowIds,
    };
  } catch (error) {
    return {
      savedCount: 0,
      skippedCount,
      failedCount: acceptedRows.length,
      errorMessages: [getHumanReadableErrorMessage(error)],
      savedRowIds: [],
    };
  }
}
