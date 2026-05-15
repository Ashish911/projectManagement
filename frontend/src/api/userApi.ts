import axios, { AxiosResponse } from "axios";
import { PROFILE, GET_USERS } from "@/queries/userQueries.ts";
import { DELETE_USER, PROMOTE_TO_ADMIN } from "@/mutations/userMutations.ts";
import type { User, ProfileResponse } from "@/types/userTypes.ts";
import type { GraphqlResponse } from "@/types/genericTypes.ts";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getProfile = async (): Promise<ProfileResponse> => {
  const response: AxiosResponse<GraphqlResponse<ProfileResponse>> = await api.post("", {
    query: PROFILE,
  });
  if (response.data.errors) throw new Error(response.data.errors[0].message);
  return response.data.data;
};

export const getUsers = async (): Promise<User[]> => {
  const response: AxiosResponse<GraphqlResponse<{ users: User[] }>> = await api.post("", {
    query: GET_USERS,
  });
  if (response.data.errors) throw new Error(response.data.errors[0].message);
  return response.data.data.users;
};

export const deleteUser = async (userId: string): Promise<void> => {
  const response: AxiosResponse<GraphqlResponse<{ deleteUser: { id: string } }>> = await api.post("", {
    query: DELETE_USER,
    variables: { userId },
  });
  if (response.data.errors) throw new Error(response.data.errors[0].message);
};

export const promoteToAdmin = async (userId: string): Promise<User> => {
  const response: AxiosResponse<GraphqlResponse<{ promoteToAdmin: User }>> = await api.post("", {
    query: PROMOTE_TO_ADMIN,
    variables: { userId },
  });
  if (response.data.errors) throw new Error(response.data.errors[0].message);
  return response.data.data.promoteToAdmin;
};
