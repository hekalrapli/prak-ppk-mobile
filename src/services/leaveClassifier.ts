// src/services/leaveClassifier.ts
import { LeaveClassification } from '../types/attendance';
import {
  createSentimentClassifier,
  EdomClassifyFn,
  EdomSentimentLabel,
} from '../lib/model-edom/sentiment';
import modelEdom from '../lib/model-edom/model';
import { analyzeIzinReason } from './izinAnalyzer';

export { LeaveClassification };

/** Kategori yang dikenali analyzer izin. */
export const LEAVE_CATEGORIES: readonly EdomSentimentLabel[] = ['positif', 'netral', 'negatif'];

/** Nama pipeline yang disimpan ke field `ai.model` di Firestore. */
export const LEAVE_MODEL_NAME = 'model-edom+izin-analyzer';

// Inferensi dijalankan on-device (pure JS, tanpa network call).
// Classifier dibuat satu kali lalu dipakai ulang (bobot model cukup besar).
let classifier: EdomClassifyFn | null = null;

function getClassifier(): EdomClassifyFn {
  if (!classifier) {
    classifier = createSentimentClassifier(modelEdom);
  }
  return classifier;
}

// exp() selalu > 0 untuk skor berhingga, sehingga total selalu > 0.
function toConfidence(scores: number[]): number {
  const max = Math.max(...scores);
  const exps = scores.map((score) => Math.exp(score - max));
  const total = exps.reduce((sum, exp) => sum + exp, 0);
  const bestIndex = scores.indexOf(max);
  return exps[bestIndex] / total;
}

/**
 * Mengklasifikasikan alasan izin secara on-device.
 *
 * Kategori (`positif`/`netral`/`negatif`) ditentukan oleh analyzer izin
 * berbasis kata kunci (lihat izinAnalyzer.ts) karena kosakata model-edom
 * berasal dari review EDOM dan tidak mengenali istilah izin seperti "sakit",
 * "demam", "keluarga", atau "mager". Model-edom tetap dijalankan sebagai
 * sinyal sentimen sekunder yang disimpan di `ai.sentiment` (tidak ditampilkan).
 *
 * Kategori adalah informasi pendukung asisten, bukan vonis terima/tolak
 * (FR-18). Kegagalan tidak melempar error agar pengajuan izin tetap dapat
 * tersimpan.
 */
export async function classifyLeaveReason(reason: string): Promise<LeaveClassification> {
  const now = Date.now();
  const text = typeof reason === 'string' ? reason.trim() : '';

  if (!text) {
    return {
      category: 'Alasan kosong, tidak dapat diklasifikasikan',
      model: LEAVE_MODEL_NAME,
      classifiedAt: now,
      state: 'failed',
    };
  }

  try {
    const analysis = analyzeIzinReason(text);

    // Sinyal sentimen sekunder dari model-edom. Gagal di sini tidak
    // memengaruhi kategori izin.
    let sentiment: LeaveClassification['sentiment'];
    try {
      const result = getClassifier()(text);
      if (result.label && result.scores) {
        sentiment = {
          category: result.label,
          confidence: toConfidence(result.scores),
        };
      }
    } catch {
      sentiment = undefined;
    }

    return {
      category: analysis.category,
      confidence: analysis.confidence,
      model: LEAVE_MODEL_NAME,
      // Jangan sertakan field undefined: Firestore menolak nilai undefined.
      ...(sentiment ? { sentiment } : {}),
      classifiedAt: now,
      state: 'success',
    };
  } catch {
    return {
      category: 'Gagal menjalankan analisis AI',
      model: LEAVE_MODEL_NAME,
      classifiedAt: Date.now(),
      state: 'failed',
    };
  }
}
