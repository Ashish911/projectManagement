import axios, { AxiosResponse } from "axios";
import { PROFILE } from "@/queries/userQueries.ts";
import type { ProfileResponse } from "@/types/userTypes.ts";
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

  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }

  return response.data.data;
};
