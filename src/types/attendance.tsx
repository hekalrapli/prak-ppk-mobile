// src/types/attendance.ts

export type UserRole = 'praktikan' | 'asisten';
export type SessionStatus = 'upcoming' | 'open' | 'closed';
export type AttendanceStatus = 'present';

export interface DemoUser {
  id: string;
  role: UserRole;
  name: string;
  identifier: string;   
  className?: string;   
}

export interface Practicum {
  id: string;
  name: string;
  className: string;
  assistantId: string;
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
}

export interface DemoState {
  activeRole: UserRole | null;
  activeUserId: string | null;
  users: DemoUser[];
  practicums: Practicum[];
  sessions: Session[];
  attendanceRecords: AttendanceRecord[];
}