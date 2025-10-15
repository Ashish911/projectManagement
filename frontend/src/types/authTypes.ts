interface Login {
  email: string;
  password: string;
}

interface AuthResponse {
  login: {
    token: string;
  }
}

interface Register {
  email: string;
  name: string;
  number: string;
  gender: string;
  dob: string;
  password: string;
}
