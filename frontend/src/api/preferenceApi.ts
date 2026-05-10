import axios, { AxiosResponse } from "axios";
import { GET_PREFERENCE } from "@/queries/preferenceQueries.ts";
import { UPDATE_PREFERENCE } from "@/mutations/preferenceMutations.ts";
import type { GraphqlResponse } from "@/types/genericTypes.ts";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface Preference {
  id: string;
  theme: "LIGHT" | "DARK";
  language: "ENGLISH" | "JAPANESE" | "KOREAN";
}

export const getPreference = async (): Promise<Preference> => {
  const response: AxiosResponse<GraphqlResponse<{ preference: Preference }>> =
    await api.post("", { query: GET_PREFERENCE });

  if (response.data.errors) throw new Error(response.data.errors[0].message);
  return response.data.data.preference;
};

export const updatePreference = async (
  variables: Partial<Pick<Preference, "theme" | "language">>
): Promise<Preference> => {
  const response: AxiosResponse<
    GraphqlResponse<{ updatePreference: Preference }>
  > = await api.post("", { query: UPDATE_PREFERENCE, variables });

  if (response.data.errors) throw new Error(response.data.errors[0].message);
  return response.data.data.updatePreference;
};
