import axios, { AxiosResponse } from "axios";
import { GET_PROJECTS } from "@/queries/projectQueries";
import {
    ADD_PROJECT,
    UPDATE_PROJECT,
    DELETE_PROJECT,
    ADD_USER_TO_PROJECT,
    REMOVE_USER_FROM_PROJECT,
} from "@/mutations/projectMutations";
import type { Project } from "@/types/projectTypes";
import type { GraphqlResponse } from "@/types/genericTypes";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const getProjects = async (): Promise<Project[]> => {
    const response: AxiosResponse<GraphqlResponse<{ projects: Project[] }>> = await api.post("", {
        query: GET_PROJECTS,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.projects;
};

export const addProject = async (vars: {
    name: string;
    description?: string;
    clientId: string;
    status?: string;
}): Promise<Project> => {
    const response: AxiosResponse<GraphqlResponse<{ addProject: Project }>> = await api.post("", {
        query: ADD_PROJECT,
        variables: vars,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.addProject;
};

export const updateProject = async (vars: {
    id: string;
    name?: string;
    description?: string;
    status?: string;
}): Promise<Project> => {
    const response: AxiosResponse<GraphqlResponse<{ updateProject: Project }>> = await api.post("", {
        query: UPDATE_PROJECT,
        variables: vars,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.updateProject;
};

export const deleteProject = async (id: string): Promise<void> => {
    const response: AxiosResponse<GraphqlResponse<{ deleteProject: { id: string } }>> = await api.post("", {
        query: DELETE_PROJECT,
        variables: { id },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
};

export const addUserToProject = async (vars: { id: string; users: string[] }): Promise<Project> => {
    const response: AxiosResponse<GraphqlResponse<{ addUserToProject: Project }>> = await api.post("", {
        query: ADD_USER_TO_PROJECT,
        variables: vars,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.addUserToProject;
};

export const removeUserFromProject = async (vars: { id: string; users: string[] }): Promise<Project> => {
    const response: AxiosResponse<GraphqlResponse<{ removeUserFromProject: Project }>> = await api.post("", {
        query: REMOVE_USER_FROM_PROJECT,
        variables: vars,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.removeUserFromProject;
};
