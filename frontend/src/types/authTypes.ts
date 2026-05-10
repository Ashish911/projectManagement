export interface Login {
  email: string;
  password: string;
}

export interface AuthResponse {
  login: {
    token: string;
  };
}

export interface Register {
  email: string;
  name: string;
  number: string;
  gender: string;
  dob: string;
  password: string;
}
