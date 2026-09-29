import axios, { AxiosResponse } from "axios";
import { LOGIN, REGISTER } from "../mutations/authMutations";
import { FORGOT_PASSWORD, RESET_PASSWORD } from "../mutations/userMutations";
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

export const forgotPassword = async (
  email: string,
): Promise<{ forgotPassword: { token: string; message: string } }> => {
  const response: AxiosResponse<
    GraphqlResponse<{ forgotPassword: { token: string; message: string } }>
  > = await api.post("", {
    query: FORGOT_PASSWORD,
    variables: { email },
  });

  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }

  return response.data.data;
};

export const resetPassword = async (
  token: string,
  password: string,
): Promise<{ resetPassword: { message: string } }> => {
  const response: AxiosResponse<
    GraphqlResponse<{ resetPassword: { message: string } }>
  > = await api.post("", {
    query: RESET_PASSWORD,
    variables: { token, password },
  });

  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }

  return response.data.data;
};
