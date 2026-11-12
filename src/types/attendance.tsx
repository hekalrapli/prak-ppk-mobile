// src/types/attendance.tsx

export type UserRole = 'praktikan' | 'asisten';
export type SessionStatus = 'upcoming' | 'open' | 'closed';
export type AttendanceStatus = 'present';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveClassification {
  category: string; // label dari model
  confidence?: number; // 0..1 jika model menyediakan
  model: string; // nama/versi model
  classifiedAt: number; // epoch ms
  state: 'success' | 'failed' | 'timeout';
}

export interface LeaveRequest {
  id?: string; // UID praktikan (ID dokumen di Firestore)
  praktikanId: string;
  praktikanName: string;
  praktikanNim: string;
  reason: string;
  status: LeaveStatus;
  ai?: LeaveClassification;
  createdAt: any;
  decidedBy?: string;
  decidedAt?: any;
  reviewNote?: string;
  sessionId?: string;
  practicumId?: string;
  practicumName?: string;
  sessionDate?: string;
}

export interface AttendanceDoc {
  id?: string; // UID praktikan
  praktikanId: string;
  praktikanName: string;
  praktikanNim: string;
  status: AttendanceStatus;
  recordedAt: any;
  sessionId?: string;
  practicumId?: string;
  practicumName?: string;
  sessionDate?: string;
}

export interface DemoUser {
  id: string;
  role: UserRole;
  name: string;
  identifier: string;
  className?: string;
  email?: string;
}

export interface Practicum {
  id: string;
  name: string;
  className: string;
  assistantId: string;
  studentIds?: string[];
}

export interface Session {
  id: string;
  practicumId: string;
  date: string;
  startTime: string;
  endTime: string;
  room: string;
  status: SessionStatus;
  openedAt?: string;
  closedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  praktikanId: string;
  status: AttendanceStatus;
  recordedAt: string;
  praktikanName?: string;
  praktikanNim?: string;
}

export interface DemoState {
  activeRole: UserRole | null;
  activeUserId: string | null;
  users: DemoUser[];
  practicums: Practicum[];
  sessions: Session[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests?: LeaveRequest[];
}
