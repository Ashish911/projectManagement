import axios, { AxiosResponse } from "axios";

const BASE_URL = "https://your-backend-api-url.com";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
});

export const loginUser = async (
  credentials: Login
): Promise<AxiosResponse<Login>> => {
  try {
    debugger;
    const response = await api.post<Login>("/login", credentials);
    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error("Invalid credentials");
  }
};

export const registerUser = async (
  userData: Register
): Promise<AxiosResponse<Register>> => {
  try {
    const response = await api.post<Register>("/register", userData);
    return response.data;
  } catch (error) {
    throw new Error("Registration failed");
  }
};
