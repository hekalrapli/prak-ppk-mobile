// src/types/attendance.tsx
import type { FieldValue, Timestamp } from 'firebase/firestore';

export type UserRole = 'praktikan' | 'asisten' | 'aslab';
export type SessionStatus = 'upcoming' | 'open' | 'closed';
export type AttendanceStatus = 'present';
export type AttendanceVerificationMethod = 'geofence' | 'qr';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type FirestoreTimestamp =
  | Timestamp
  | FieldValue
  | Date
  | number
  | string
  | { seconds: number; nanoseconds?: number }
  | null;

export interface LeaveClassification {
  category: string; // kategori izin: positif / netral / negatif
  confidence?: number; // 0..1
  model: string; // nama pipeline klasifikasi
  classifiedAt: number; // epoch ms
  state: 'success' | 'failed' | 'timeout';
  /** Sinyal sentimen sekunder dari model-edom (tidak ditampilkan di UI). */
  sentiment?: {
    category: string;
    confidence?: number;
  };
}

export interface LeaveRequest {
  id?: string; // UID praktikan (ID dokumen di Firestore)
  praktikanId: string;
  praktikanName: string;
  praktikanNim: string;
  reason: string;
  status: LeaveStatus;
  ai?: LeaveClassification;
  createdAt: FirestoreTimestamp;
  decidedBy?: string;
  decidedAt?: FirestoreTimestamp;
  reviewNote?: string;
  sessionId?: string;
  practicumId?: string;
  practicumName?: string;
  sessionDate?: string;
}

export interface AttendanceGeofence {
  /** Jarak perangkat ke titik laboratorium saat presensi (meter). */
  distanceMeter: number;
  deviceLat: number;
  deviceLng: number;
  /** true bila koordinat lolos verifikasi radius di sisi klien. */
  isLocationVerified: boolean;
}

export interface AttendanceQrVerification {
  /** Token acak aktif hasil pindai QR sesi. */
  token: string;
}

export interface AttendanceDoc {
  id?: string; // UID praktikan
  praktikanId: string;
  praktikanName: string;
  praktikanNim: string;
  status: AttendanceStatus;
  recordedAt: FirestoreTimestamp;
  sessionId?: string;
  practicumId?: string;
  practicumName?: string;
  sessionDate?: string;
  /** Metode verifikasi presensi; kosong untuk presensi lama sebelum Sprint 3. */
  verificationMethod?: AttendanceVerificationMethod;
  /** Token QR tervalidasi (hanya terisi bila `verificationMethod === 'qr'`). */
  qrToken?: string;
  /** Jejak audit geofence; kosong untuk presensi lama atau verifikasi QR. */
  distanceMeter?: number;
  deviceLat?: number;
  deviceLng?: number;
  isLocationVerified?: boolean;
}

export interface Practicum {
  id: string;
  name: string;
  className: string;
  assistantId: string;
  /** Nama asisten didenormalisasi agar praktikan dapat menampilkannya. */
  assistantName?: string;
  studentIds?: string[];
}

export interface Session {
  id: string;
  practicumId: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  lab_id?: string;
  status: SessionStatus;
  /** Referensi laboratorium untuk validasi geofence (FR-P1-02). */
  labId?: string;
  openedAt?: string;
  closedAt?: string;
}

export interface Laboratory {
  id: string;
  nama: string;
  gedung: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
  updated_at: FirestoreTimestamp;
}
