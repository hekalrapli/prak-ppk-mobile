import type { UserRole } from './attendance';

export interface UserProfile {
  uid: string;
  name: string;
  identifier: string;
  email: string;
  role: UserRole;
}
