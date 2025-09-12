import axios, { AxiosResponse } from "axios";
import { LOGIN } from "../mutations/authMutations";

const BASE_URL = "http://localhost:4040/graphql";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
});

export const loginUser = async (
  credentials: Login
): Promise<AxiosResponse<LoginResponse>> => {
  try {
    const response = await api.post<LoginResponse>("", {
      query: LOGIN,
      variables: credentials,
    });
    return response;
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
