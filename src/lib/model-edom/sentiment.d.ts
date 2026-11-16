// src/lib/model-edom/sentiment.d.ts
// Deklarasi tipe untuk src/lib/model-edom/sentiment.js (inferensi pure JS
// dari repo model-edom). File .js aslinya tidak diubah.

export type EdomSentimentLabel = 'negatif' | 'netral' | 'positif';

/** Bentuk model-edom.json (schema_version 1, LinearSVC 3 kelas). */
export interface EdomSentimentModel {
  schema_version: number;
  status: string;
  algorithm: string;
  /** Urutan label = urutan skor di `scores` hasil klasifikasi. */
  labels: string[];
  /** Normalisasi kata gaul (mis. "gak" -> "tidak"). */
  aliases: Record<string, string>;
  /** Vocab unigram + bigram: gram -> indeks fitur. */
  vocabulary: Record<string, number>;
  idf: number[];
  /** Bobot per kelas (mengikuti urutan `labels`). */
  weights: number[][];
  bias: number[];
  preprocessing: string;
  training_data?: string;
}

export interface EdomSentimentResult {
  /** null bila input kosong / tak ada gram yang dikenali (BUKAN netral). */
  label: EdomSentimentLabel | null;
  status: 'predicted' | 'empty_input' | 'unknown_vocabulary';
  /** Decision margin per kelas, urutan mengikuti `labels`. */
  scores: number[] | null;
  scoreType: 'decision_margin' | 'log_score' | 'none';
  experimental: boolean;
}

export type EdomClassifyFn = (text: string) => EdomSentimentResult;

export function createSentimentClassifier(model: EdomSentimentModel): EdomClassifyFn;
