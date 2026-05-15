import axios, { AxiosResponse } from "axios";
import { GET_CLIENTS } from "@/queries/clientQueries.ts";
import {
    ADD_CLIENT,
    UPDATE_CLIENT,
    CONFIRM_DELETE_CLIENT,
    DELETE_CLIENT_BY_SUPER_ADMIN,
    FORCE_DELETE_CLIENT,
    ASSIGN_ADMIN,
} from "@/mutations/clientMutations.ts";
import type { Client } from "@/types/clientTypes.ts";
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

export const getClients = async (): Promise<Client[]> => {
    const response: AxiosResponse<GraphqlResponse<{ clients: Client[] }>> = await api.post("", {
        query: GET_CLIENTS,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.clients;
};

export const addClient = async (vars: { name: string; email: string; phone: string; assignedAdmin?: string }): Promise<Client> => {
    const response: AxiosResponse<GraphqlResponse<{ addClient: Client }>> = await api.post("", {
        query: ADD_CLIENT,
        variables: vars,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.addClient;
};

export const updateClient = async (vars: { id: string; name: string; email: string; phone: string; assignedAdmin?: string }): Promise<Client> => {
    const response: AxiosResponse<GraphqlResponse<{ updateClient: Client }>> = await api.post("", {
        query: UPDATE_CLIENT,
        variables: vars,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.updateClient;
};

export const confirmDeleteClient = async (id: string): Promise<void> => {
    const response: AxiosResponse<GraphqlResponse<{ confirmDeleteClient: { id: string } }>> = await api.post("", {
        query: CONFIRM_DELETE_CLIENT,
        variables: { id },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
};

export const deleteClientBySuperAdmin = async (id: string): Promise<void> => {
    const response: AxiosResponse<GraphqlResponse<{ deleteClientBySuperAdmin: { id: string } }>> = await api.post("", {
        query: DELETE_CLIENT_BY_SUPER_ADMIN,
        variables: { id },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
};

export const forceDeleteClient = async (id: string): Promise<void> => {
    const response: AxiosResponse<GraphqlResponse<{ forceDeleteClient: { id: string } }>> = await api.post("", {
        query: FORCE_DELETE_CLIENT,
        variables: { id },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
};

export const assignAdmin = async (vars: { id: string; assignedAdmin: string }): Promise<Client> => {
    const response: AxiosResponse<GraphqlResponse<{ assignAdmin: Client }>> = await api.post("", {
        query: ASSIGN_ADMIN,
        variables: vars,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.assignAdmin;
};
