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
  fullName: string;
  phoneNumber: string;
  gender: string;
  dob: string;
  password: string;
}
