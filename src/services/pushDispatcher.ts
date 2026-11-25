// src/services/pushDispatcher.ts
import { doc, getDoc } from 'firebase/firestore';

import { db } from './firebase';
import {
  DEFAULT_NOTIFICATION_CHANNEL_ID,
  isValidExpoPushToken,
} from './notificationService';

export const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
export const EXPO_PUSH_MAX_BATCH_SIZE = 100;
export const EXPO_PUSH_TIMEOUT_MS = 10_000;

export type PushEventType =
  | 'session_opened'
  | 'schedule_modified'
  | 'leave_decision';

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  channelId: string;
  priority: 'high';
  data: Record<string, string>;
}

export interface PushDispatchSummary {
  attempted: number;
  sent: number;
  failed: number;
  skippedNoToken: number;
  invalidTickets: number;
}

interface ExpoPushTicket {
  status?: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
}

interface ExpoPushApiResponse {
  data?: ExpoPushTicket[];
  errors?: { code?: string; message?: string }[];
}

/**
 * Mengambil token Expo Push yang valid dari koleksi `users/{uid}` untuk daftar UID.
 * - UID dideduplikasi sebelum membaca Firestore.
 * - Penerima tanpa token dilewati tanpa error.
 * - Token dideduplikasi global agar satu perangkat tidak menerima notifikasi ganda.
 */
async function resolveRecipientTokens(
  recipientUids: string[]
): Promise<{ tokens: string[]; skippedNoToken: number }> {
  const uniqueUids = Array.from(
    new Set(recipientUids.map((uid) => uid.trim()).filter(Boolean))
  );

  if (uniqueUids.length === 0) {
    return { tokens: [], skippedNoToken: 0 };
  }

  const results = await Promise.allSettled(
    uniqueUids.map((uid) => getDoc(doc(db, 'users', uid)))
  );

  const uniqueTokens = new Set<string>();
  let skippedNoToken = 0;

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') {
      console.warn(
        `[PushDispatcher] Gagal membaca dokumen users/${uniqueUids[index]}:`,
        result.reason instanceof Error ? result.reason.message : result.reason
      );
      skippedNoToken += 1;
      return;
    }

    const snap = result.value;
    if (!snap.exists()) {
      skippedNoToken += 1;
      return;
    }

    const rawTokens = snap.data()?.fcm_tokens;
    const validTokens = Array.isArray(rawTokens)
      ? rawTokens.filter(isValidExpoPushToken)
      : [];

    if (validTokens.length === 0) {
      skippedNoToken += 1;
      return;
    }

    validTokens.forEach((token) => uniqueTokens.add(token));
  });

  return {
    tokens: Array.from(uniqueTokens),
    skippedNoToken,
  };
}

async function postExpoPushChunk(messages: ExpoPushMessage[]): Promise<{
  sent: number;
  failed: number;
  invalidTickets: number;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXPO_PUSH_TIMEOUT_MS);

  try {
    const response = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(
        `[PushDispatcher] Expo Push API merespons HTTP ${response.status}.`
      );
      return { sent: 0, failed: messages.length, invalidTickets: 0 };
    }

    const body = (await response.json().catch(() => null)) as
      | ExpoPushApiResponse
      | null;

    if (Array.isArray(body?.errors) && body.errors.length > 0) {
      console.warn('[PushDispatcher] Error tingkat request Expo Push API:', body.errors);
    }

    const tickets = Array.isArray(body?.data) ? body.data : [];
    if (tickets.length === 0) {
      return { sent: messages.length, failed: 0, invalidTickets: 0 };
    }

    let sent = 0;
    let failed = 0;
    let invalidTickets = 0;

    tickets.forEach((ticket, idx) => {
      if (ticket.status === 'ok') {
        sent += 1;
        return;
      }

      failed += 1;
      const errorCode = ticket.details?.error ?? 'unknown';
      if (
        errorCode === 'DeviceNotRegistered' ||
        errorCode === 'InvalidCredentials'
      ) {
        invalidTickets += 1;
      }
      console.warn(
        `[PushDispatcher] Tiket push gagal (index ${idx}, code=${errorCode}):`,
        ticket.message ?? 'Tanpa pesan detail'
      );
    });

    return { sent, failed, invalidTickets };
  } catch (error) {
    const isAbort =
      error instanceof Error && error.name === 'AbortError';
    console.warn(
      isAbort
        ? `[PushDispatcher] Permintaan ke Expo Push API melewati batas waktu ${EXPO_PUSH_TIMEOUT_MS}ms.`
        : '[PushDispatcher] Gagal mengirim batch ke Expo Push API:',
      isAbort ? '' : error instanceof Error ? error.message : error
    );
    return { sent: 0, failed: messages.length, invalidTickets: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Mengirim push notification ke daftar UID penerima melalui Expo Push API.
 * Memecah permintaan per 100 pesan (batas Expo Push API) dengan timeout 10 detik.
 * Tidak pernah melempar error agar tidak mengganggu aksi bisnis utama.
 */
export async function dispatchExpoPushNotifications(params: {
  recipientUids: string[];
  title: string;
  body: string;
  data: Record<string, string>;
}): Promise<PushDispatchSummary> {
  const emptySummary: PushDispatchSummary = {
    attempted: 0,
    sent: 0,
    failed: 0,
    skippedNoToken: 0,
    invalidTickets: 0,
  };

  try {
    const { tokens, skippedNoToken } = await resolveRecipientTokens(
      params.recipientUids
    );

    if (tokens.length === 0) {
      console.info(
        `[PushDispatcher] Tidak ada token valid untuk dikirim (skippedNoToken=${skippedNoToken}).`
      );
      return { ...emptySummary, skippedNoToken };
    }

    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      title: params.title,
      body: params.body,
      sound: 'default',
      channelId: DEFAULT_NOTIFICATION_CHANNEL_ID,
      priority: 'high',
      data: params.data,
    }));

    let sent = 0;
    let failed = 0;
    let invalidTickets = 0;

    for (
      let offset = 0;
      offset < messages.length;
      offset += EXPO_PUSH_MAX_BATCH_SIZE
    ) {
      const chunk = messages.slice(offset, offset + EXPO_PUSH_MAX_BATCH_SIZE);
      const chunkResult = await postExpoPushChunk(chunk);
      sent += chunkResult.sent;
      failed += chunkResult.failed;
      invalidTickets += chunkResult.invalidTickets;
    }

    const summary: PushDispatchSummary = {
      attempted: messages.length,
      sent,
      failed,
      skippedNoToken,
      invalidTickets,
    };
    console.info('[PushDispatcher] Ringkasan kirim:', summary);
    return summary;
  } catch (error) {
    console.warn(
      '[PushDispatcher] Kegagalan tak terduga saat dispatch notifikasi:',
      error instanceof Error ? error.message : error
    );
    return emptySummary;
  }
}

async function resolveSessionLocationLabel(
  practicumId: string,
  sessionId: string
): Promise<string> {
  try {
    const sessionSnap = await getDoc(
      doc(db, 'practicums', practicumId, 'sessions', sessionId)
    );
    if (!sessionSnap.exists()) {
      return 'Laboratorium';
    }

    const sessionData = sessionSnap.data();
    const labId =
      typeof sessionData.lab_id === 'string' && sessionData.lab_id.trim()
        ? sessionData.lab_id.trim()
        : typeof sessionData.labId === 'string' && sessionData.labId.trim()
          ? sessionData.labId.trim()
          : '';

    if (labId) {
      const labSnap = await getDoc(doc(db, 'laboratorium', labId)).catch(
        () => null
      );
      if (labSnap?.exists()) {
        const labData = labSnap.data();
        const labName =
          typeof labData.nama === 'string' && labData.nama.trim()
            ? labData.nama.trim()
            : typeof labData.name === 'string' && labData.name.trim()
              ? labData.name.trim()
              : '';
        if (labName) {
          return labName;
        }
      }
    }

    if (typeof sessionData.room === 'string' && sessionData.room.trim()) {
      return sessionData.room.trim();
    }
  } catch {
    // Fallback ke label default.
  }

  return 'Laboratorium';
}

/**
 * FR-P2-02 Event 1: Sesi Praktikum Dibuka (`session_opened`).
 * Penerima: seluruh praktikan peserta pada `practicums/{practicumId}.studentIds`.
 */
export async function notifySessionOpened(
  practicumId: string,
  sessionId: string
): Promise<void> {
  try {
    const practicumSnap = await getDoc(doc(db, 'practicums', practicumId));
    if (!practicumSnap.exists()) {
      return;
    }

    const practicumData = practicumSnap.data();
    const practicumName =
      typeof practicumData.name === 'string' && practicumData.name.trim()
        ? practicumData.name.trim()
        : 'Praktikum';
    const studentIds = Array.isArray(practicumData.studentIds)
      ? practicumData.studentIds.filter(
          (uid: unknown): uid is string => typeof uid === 'string'
        )
      : [];

    if (studentIds.length === 0) {
      return;
    }

    const locationLabel = await resolveSessionLocationLabel(
      practicumId,
      sessionId
    );

    await dispatchExpoPushNotifications({
      recipientUids: studentIds,
      title: 'Sesi Praktikum Dibuka!',
      body: `Sesi ${practicumName} di ${locationLabel} telah dibuka. Silakan lakukan presensi di lokasi.`,
      data: {
        type: 'session_opened',
        practicumId,
        sessionId,
      },
    });
  } catch (error) {
    console.warn(
      '[PushDispatcher] Gagal memproses notifikasi session_opened:',
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * FR-P2-02 Event 2: Perubahan Jadwal Praktikum (`schedule_modified`).
 * Penerima: seluruh praktikan peserta (`studentIds`) dan asisten pengampu (`assistantId`),
 * mengecualikan UID pemicu agar tidak mengirim notifikasi ke dirinya sendiri.
 */
export async function notifyScheduleModified(
  practicumId: string,
  sessionId: string,
  triggeredByUid?: string
): Promise<void> {
  try {
    const practicumSnap = await getDoc(doc(db, 'practicums', practicumId));
    if (!practicumSnap.exists()) {
      return;
    }

    const practicumData = practicumSnap.data();
    const practicumName =
      typeof practicumData.name === 'string' && practicumData.name.trim()
        ? practicumData.name.trim()
        : 'Praktikum';
    const studentIds = Array.isArray(practicumData.studentIds)
      ? practicumData.studentIds.filter(
          (uid: unknown): uid is string => typeof uid === 'string'
        )
      : [];
    const assistantId =
      typeof practicumData.assistantId === 'string'
        ? practicumData.assistantId
        : '';

    const recipients = [
      ...studentIds,
      ...(assistantId && assistantId !== triggeredByUid ? [assistantId] : []),
    ];

    if (recipients.length === 0) {
      return;
    }

    await dispatchExpoPushNotifications({
      recipientUids: recipients,
      title: 'Perubahan Jadwal Praktikum',
      body: `Jadwal praktikum ${practicumName} mengalami perubahan. Periksa detail sesi terbaru.`,
      data: {
        type: 'schedule_modified',
        practicumId,
        sessionId,
      },
    });
  } catch (error) {
    console.warn(
      '[PushDispatcher] Gagal memproses notifikasi schedule_modified:',
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * FR-P2-02 & FR-P2-05 Event 3: Status Pengajuan Izin (`leave_decision`).
 * Penerima: praktikan pengaju izin (`praktikanId`).
 * Memuat keputusan (`Disetujui`/`Ditolak`) serta catatan asisten bila ada.
 */
const MAX_NOTIFICATION_NOTE_LENGTH = 120;

export async function notifyLeaveDecision(params: {
  practicumId: string;
  sessionId: string;
  praktikanId: string;
  decision: 'approved' | 'rejected';
  reviewNote?: string;
}): Promise<void> {
  try {
    const { practicumId, sessionId, praktikanId, decision, reviewNote } = params;
    const practicumSnap = await getDoc(doc(db, 'practicums', practicumId));
    const practicumData = practicumSnap.exists() ? practicumSnap.data() : null;
    const practicumName =
      typeof practicumData?.name === 'string' && practicumData.name.trim()
        ? practicumData.name.trim()
        : 'Praktikum';

    const statusLabel = decision === 'approved' ? 'Disetujui' : 'Ditolak';
    const trimmedNote = reviewNote?.trim() ?? '';
    const noteSnippet =
      trimmedNote.length > MAX_NOTIFICATION_NOTE_LENGTH
        ? `${trimmedNote.slice(0, MAX_NOTIFICATION_NOTE_LENGTH - 1)}…`
        : trimmedNote;
    const body = noteSnippet
      ? `Pengajuan izin Anda untuk praktikum ${practicumName} telah ${statusLabel} oleh asisten. Catatan: "${noteSnippet}"`
      : `Pengajuan izin Anda untuk praktikum ${practicumName} telah ${statusLabel} oleh asisten.`;

    await dispatchExpoPushNotifications({
      recipientUids: [praktikanId],
      title: 'Status Pengajuan Izin',
      body,
      data: {
        type: 'leave_decision',
        practicumId,
        sessionId,
        decision,
      },
    });
  } catch (error) {
    console.warn(
      '[PushDispatcher] Gagal memproses notifikasi leave_decision:',
      error instanceof Error ? error.message : error
    );
  }
}
