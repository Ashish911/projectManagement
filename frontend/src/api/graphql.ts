import axios, { AxiosError } from "axios";
import type { GraphqlResponse } from "@/types/genericTypes";

/** The one HTTP client for the GraphQL API; attaches the stored JWT to every request. */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

/** Posts a GraphQL operation and returns `data`, throwing the first GraphQL error's message. */
export async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    try {
        const response = await api.post<GraphqlResponse<T>>("", { query, variables });
        if (response.data.errors?.length) throw new Error(response.data.errors[0].message);
        return response.data.data;
    } catch (e) {
        // Non-2xx replies (401, 429…) still carry GraphQL errors; prefer their message over Axios's
        const message = (e as AxiosError<GraphqlResponse<T>>).response?.data?.errors?.[0]?.message;
        throw message ? new Error(message) : e;
    }
}
