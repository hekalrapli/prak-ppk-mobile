import { parseSessionDate } from '@/lib/session-date';
import type { Session } from '@/types/attendance';

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Penanda "sekarang" hanya untuk tampilan timeline. Status sesi tetap
 * dikelola manual oleh asisten dan tidak pernah dihitung dari jam perangkat.
 */
export function isSessionHappeningNow(session: Session, now = new Date()): boolean {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (parseSessionDate(session.date) !== today) {
    return false;
  }

  const current = now.getHours() * 60 + now.getMinutes();
  return current >= toMinutes(session.startTime) && current <= toMinutes(session.endTime);
}
