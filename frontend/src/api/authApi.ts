import { LOGIN, REGISTER } from "../mutations/authMutations";
import { FORGOT_PASSWORD, RESET_PASSWORD } from "../mutations/userMutations";
import { gql } from "@/api/graphql";
import type { Login, AuthResponse, Register } from "@/types/authTypes.ts";

export const loginUser = async (credentials: Login): Promise<AuthResponse> =>
  await gql<AuthResponse>(LOGIN, { ...credentials });

export const registerUser = async (userData: Register): Promise<{ register: { name: string } }> =>
  await gql<{ register: { name: string } }>(REGISTER, { ...userData });

export const forgotPassword = async (email: string): Promise<{ forgotPassword: { message: string } }> =>
  await gql<{ forgotPassword: { message: string } }>(FORGOT_PASSWORD, { email });

export const resetPassword = async (token: string, password: string): Promise<{ resetPassword: { message: string } }> =>
  await gql<{ resetPassword: { message: string } }>(RESET_PASSWORD, { token, password });
