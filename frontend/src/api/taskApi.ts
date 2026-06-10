import axios, { AxiosResponse } from "axios";
import { GET_TASKS } from "@/queries/taskQueries";
import {
    CREATE_TASK,
    UPDATE_TASK,
    UPDATE_TASK_STATUS,
    DELETE_TASK,
} from "@/mutations/taskMutations";
import type { Task } from "@/types/taskTypes";
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

export const getTasks = async (projectId: string): Promise<Task[]> => {
    const response: AxiosResponse<GraphqlResponse<{ tasks: Task[] }>> = await api.post("", {
        query: GET_TASKS,
        variables: { projectId },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.tasks;
};

export const createTask = async (vars: {
    title: string;
    projectId: string;
    assignedTo?: string;
    deadline?: string;
    priority?: string;
}): Promise<Task> => {
    const response: AxiosResponse<GraphqlResponse<{ createTask: Task }>> = await api.post("", {
        query: CREATE_TASK,
        variables: vars,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.createTask;
};

export const updateTask = async (vars: {
    id: string;
    title?: string;
    assignedTo?: string;
    deadline?: string;
    priority?: string;
}): Promise<Task> => {
    const response: AxiosResponse<GraphqlResponse<{ updateTask: Task }>> = await api.post("", {
        query: UPDATE_TASK,
        variables: vars,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.updateTask;
};

export const updateTaskStatus = async (id: string, status: string): Promise<Task> => {
    const response: AxiosResponse<GraphqlResponse<{ updateTaskStatus: Task }>> = await api.post("", {
        query: UPDATE_TASK_STATUS,
        variables: { id, status },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.updateTaskStatus;
};

export const deleteTask = async (id: string): Promise<void> => {
    const response: AxiosResponse<GraphqlResponse<{ deleteTask: { id: string } }>> = await api.post("", {
        query: DELETE_TASK,
        variables: { id },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
};
