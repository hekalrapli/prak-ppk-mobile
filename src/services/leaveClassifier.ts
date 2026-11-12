// src/services/leaveClassifier.ts
import { LeaveClassification } from '../types/attendance';

export { LeaveClassification };

const TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Memanggil layanan model AI untuk mengklasifikasikan alasan izin.
 * Menerapkan timeout 10 detik dan 1x retry otomatis jika gagal.
 * Jika AI gagal / timeout, mengembalikan objek dengan state 'failed' atau 'timeout'
 * tanpa melempar error agar pengajuan izin tetap dapat tersimpan (FR-18).
 */
export async function classifyLeaveReason(reason: string): Promise<LeaveClassification> {
  const apiUrl = process.env.EXPO_PUBLIC_AI_API_URL?.trim();
  const now = Date.now();

  // Jika URL AI belum dikonfigurasi di .env
  if (!apiUrl) {
    return {
      category: 'Klasifikasi belum dikonfigurasi',
      model: 'none',
      classifiedAt: now,
      state: 'failed',
    };
  }

  const payload = JSON.stringify({ reason: reason.trim() });
  const requestOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: payload,
  };

  // Mencoba pemanggilan pertama dan 1x retry jika gagal
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await fetchWithTimeout(apiUrl, requestOptions, TIMEOUT_MS);

      if (!response.ok) {
        if (attempt === 1) continue; // retry 1x
        return {
          category: 'Tidak tersedia',
          model: 'external-model',
          classifiedAt: Date.now(),
          state: 'failed',
        };
      }

      const data = await response.json();
      // Format respon fleksibel: { category, confidence, model } atau { label, score }
      const category = data.category || data.label || data.prediction || 'Lainnya';
      const confidence = typeof data.confidence === 'number' ? data.confidence : typeof data.score === 'number' ? data.score : undefined;
      const model = data.model || 'ai-classifier-v1';

      return {
        category: String(category),
        confidence,
        model: String(model),
        classifiedAt: Date.now(),
        state: 'success',
      };
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes('aborted');
      if (attempt === 1) {
        // Coba lagi 1x sebelum menyerah
        continue;
      }

      return {
        category: isTimeout ? 'Batas waktu habis' : 'Tidak tersedia',
        model: 'ai-classifier',
        classifiedAt: Date.now(),
        state: isTimeout ? 'timeout' : 'failed',
      };
    }
  }

  return {
    category: 'Tidak tersedia',
    model: 'ai-classifier',
    classifiedAt: Date.now(),
    state: 'failed',
  };
}

