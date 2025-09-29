import axios, { AxiosResponse } from "axios";
import { LOGIN }  from "../mutations/authMutations";

const BASE_URL = "http://localhost:8000/graphql";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
});

export const loginUser = async (
  credentials: Login
): Promise<AuthResponse> => {
  try {
    const response: AxiosResponse<GraphqlResponse<AuthResponse>> = await api.post("", {
      query: LOGIN,
      variables: credentials,
    });

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    return response.data.data;
  } catch (error) {
    console.log(error);
    throw new Error("Invalid credentials");
  }
};

export const registerUser = async (
  userData: Register
): Promise<AxiosResponse<Register>> => {
  try {
    return await api.post<Register>("", userData);
  } catch (error) {
    throw new Error("Registration failed");
  }
};
