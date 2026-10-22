import { DemoUser, Practicum, Session } from '../types/attendance';

export const DUMMY_USERS: DemoUser[] = [
  { id: 'P-01', role: 'praktikan', name: 'Nabila Putri', identifier: '2211102034', className: 'IF-3A' },
  { id: 'P-02', role: 'praktikan', name: 'Bagas Saputra', identifier: '2211102041', className: 'IF-3A' },
  { id: 'P-03', role: 'praktikan', name: 'Salsabila Rahma', identifier: '2211102052', className: 'IF-3A' },
  { id: 'A-01', role: 'asisten', name: 'Raka Pratama', identifier: '2211101008' },
  { id: 'A-02', role: 'asisten', name: 'Dinda Maharani', identifier: '2211101015' },
];

export const DUMMY_PRACTICUMS: Practicum[] = [
  { id: 'PRK-1', name: 'Praktikum Pemrograman Mobile', className: 'IF-3A', assistantId: 'A-01' },
  { id: 'PRK-2', name: 'Praktikum Basis Data', className: 'IF-3A', assistantId: 'A-02' },
  { id: 'PRK-3', name: 'Praktikum Jaringan Komputer', className: 'IF-3A', assistantId: 'A-01' },
  { id: 'PRK-4', name: 'Praktikum Struktur Data', className: 'IF-3A', assistantId: 'A-02' },
];

export const DUMMY_SESSIONS: Session[] = [
  { id: 'S-01', practicumId: 'PRK-1', date: 'Senin, 26 Okt 2026', startTime: '08:00', endTime: '09:40', room: 'Lab Mobile 2', status: 'upcoming' },
  { id: 'S-02', practicumId: 'PRK-2', date: 'Selasa, 27 Okt 2026', startTime: '10:00', endTime: '11:40', room: 'Lab Basis Data 1', status: 'open' },
  { id: 'S-03', practicumId: 'PRK-3', date: 'Senin, 19 Okt 2026', startTime: '13:00', endTime: '14:40', room: 'Lab Jaringan', status: 'closed' },
  { id: 'S-04', practicumId: 'PRK-4', date: 'Rabu, 28 Okt 2026', startTime: '15:00', endTime: '16:40', room: 'Lab Komputer 3', status: 'upcoming' },
];