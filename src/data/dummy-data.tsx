import { AttendanceRecord, DemoUser, Practicum, Session } from '../types/attendance';

export const DUMMY_USERS: DemoUser[] = [
  { id: 'P-01', role: 'praktikan', name: 'Nabila Putri', identifier: '2211102034', className: 'IF-3A' },
  { id: 'P-02', role: 'praktikan', name: 'Bagas Saputra', identifier: '2211102041', className: 'IF-3A' },
  { id: 'P-03', role: 'praktikan', name: 'Salsabila Rahma', identifier: '2211102052', className: 'IF-3A' },
  { id: 'A-01', role: 'asisten', name: 'Raka Pratama', identifier: '2211101008' },
  { id: 'A-02', role: 'asisten', name: 'Dinda Maharani', identifier: '2211101015' },
  { id: 'A-03', role: 'asisten', name: 'Fajar Nugroho', identifier: '2211101022' },
  { id: 'A-04', role: 'asisten', name: 'Intan Permata', identifier: '2211101039' },
  { id: 'A-05', role: 'asisten', name: 'Bayu Setiawan', identifier: '2211101046' },
  { id: 'A-06', role: 'asisten', name: 'Citra Lestari', identifier: '2211101053' },
];

export const DUMMY_PRACTICUMS: Practicum[] = [
  { id: 'PRK-1', name: 'Praktikum Pemrograman Mobile', className: 'IF-3A', assistantId: 'A-01' },
  { id: 'PRK-2', name: 'Praktikum Basis Data', className: 'IF-3A', assistantId: 'A-02' },
  { id: 'PRK-3', name: 'Praktikum Jaringan Komputer', className: 'IF-3A', assistantId: 'A-01' },
  { id: 'PRK-4', name: 'Praktikum Struktur Data', className: 'IF-3A', assistantId: 'A-02' },
  { id: 'PRK-5', name: 'Praktikum Sistem Operasi', className: 'IF-3A', assistantId: 'A-03' },
  { id: 'PRK-6', name: 'Praktikum Kecerdasan Buatan', className: 'IF-3A', assistantId: 'A-04' },
  { id: 'PRK-7', name: 'Praktikum Rekayasa Perangkat Lunak', className: 'IF-3A', assistantId: 'A-05' },
  { id: 'PRK-8', name: 'Praktikum Keamanan Informasi', className: 'IF-3A', assistantId: 'A-06' },
  { id: 'PRK-9', name: 'Praktikum Pemrograman Web', className: 'IF-3A', assistantId: 'A-03' },
  { id: 'PRK-10', name: 'Praktikum Analisis dan Perancangan Sistem', className: 'IF-3A', assistantId: 'A-04' },
];

export const DUMMY_SESSIONS: Session[] = [
  { id: 'S-01', practicumId: 'PRK-1', date: 'Senin, 26 Okt 2026', startTime: '08:00', endTime: '09:40', room: 'Lab Mobile 2', status: 'upcoming' },
  { id: 'S-02', practicumId: 'PRK-2', date: 'Selasa, 27 Okt 2026', startTime: '10:00', endTime: '11:40', room: 'Lab Basis Data 1', status: 'open' },
  { id: 'S-03', practicumId: 'PRK-3', date: 'Senin, 19 Okt 2026', startTime: '13:00', endTime: '14:40', room: 'Lab Jaringan', status: 'closed' },
  { id: 'S-04', practicumId: 'PRK-4', date: 'Rabu, 28 Okt 2026', startTime: '15:00', endTime: '16:40', room: 'Lab Komputer 3', status: 'upcoming' },
  { id: 'S-05', practicumId: 'PRK-5', date: 'Kamis, 29 Okt 2026', startTime: '08:00', endTime: '09:40', room: 'Lab Sistem Operasi', status: 'upcoming' },
  { id: 'S-06', practicumId: 'PRK-6', date: 'Kamis, 29 Okt 2026', startTime: '10:00', endTime: '11:40', room: 'Lab Kecerdasan Buatan', status: 'open' },
  { id: 'S-07', practicumId: 'PRK-7', date: 'Jumat, 30 Okt 2026', startTime: '13:00', endTime: '14:40', room: 'Lab RPL', status: 'upcoming' },
  { id: 'S-08', practicumId: 'PRK-8', date: 'Jumat, 30 Okt 2026', startTime: '15:00', endTime: '16:40', room: 'Lab Keamanan', status: 'closed' },
  { id: 'S-09', practicumId: 'PRK-9', date: 'Selasa, 20 Okt 2026', startTime: '08:00', endTime: '09:40', room: 'Lab Web', status: 'open' },
  { id: 'S-10', practicumId: 'PRK-10', date: 'Selasa, 20 Okt 2026', startTime: '10:00', endTime: '11:40', room: 'Lab APSI', status: 'open' },
];

export const DUMMY_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  { id: 'ATT-S03-P02', sessionId: 'S-03', praktikanId: 'P-02', status: 'present', recordedAt: '13:02' },
  { id: 'ATT-S03-P01', sessionId: 'S-03', praktikanId: 'P-01', status: 'present', recordedAt: '13:04' },
  { id: 'ATT-S03-P03', sessionId: 'S-03', praktikanId: 'P-03', status: 'present', recordedAt: '13:09' },
  { id: 'ATT-S02-P02', sessionId: 'S-02', praktikanId: 'P-02', status: 'present', recordedAt: '10:06' },
  { id: 'ATT-S02-P03', sessionId: 'S-02', praktikanId: 'P-03', status: 'present', recordedAt: '10:11' },
];
