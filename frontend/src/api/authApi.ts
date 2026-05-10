import axios, { AxiosResponse } from "axios";
import { LOGIN, REGISTER } from "../mutations/authMutations";
import type { Login, AuthResponse, Register } from "@/types/authTypes.ts";
import type { GraphqlResponse } from "@/types/genericTypes.ts";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
});

export const loginUser = async (credentials: Login): Promise<AuthResponse> => {
  const response: AxiosResponse<GraphqlResponse<AuthResponse>> = await api.post(
    "",
    {
      query: LOGIN,
      variables: credentials,
    },
  );

  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }

  return response.data.data;
};

export const registerUser = async (
  userData: Register,
): Promise<{ register: { name: string } }> => {
  const response: AxiosResponse<
    GraphqlResponse<{ register: { name: string } }>
  > = await api.post("", {
    query: REGISTER,
    variables: userData,
  });

  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }

  return response.data.data;
};
