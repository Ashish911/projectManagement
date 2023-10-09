interface Login {
  email: string;
  password: string;
}

interface LoginResponse {
  data: string;
  status: string;
  statusText: string;
  headers: string;
  config: string;
}

interface Register {
  email: string;
  fullName: string;
  phoneNumber: string;
  gender: string;
  dob: string;
  password: string;
}
