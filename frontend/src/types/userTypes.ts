export type Role = 'SUPER_ADMIN' | 'CLIENT_ADMIN' | 'USER';
export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'INVITED';

export interface User {
  id: string;
  name: string;
  email: string;
  number: string;
  gender: string;
  dob: string | null;
  role: Role;
  /** Derived on the server: LOCKED after repeated failed sign-ins, INVITED until first sign-in */
  status?: AccountStatus;
  lastLoginAt?: string | null;
}

export interface ProfileResponse {
  profile: User;
}
