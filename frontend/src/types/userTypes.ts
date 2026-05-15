export interface User {
  id: string;
  name: string;
  email: string;
  number: string;
  gender: string;
  dob: string;
  role: string;
}

export interface ProfileResponse {
  profile: User;
}
