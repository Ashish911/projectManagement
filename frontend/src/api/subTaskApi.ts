import axios, { AxiosResponse } from "axios";
import { GET_SUB_TASKS } from "@/queries/subTaskQueries";
import {
    CREATE_SUB_TASK,
    UPDATE_SUB_TASK,
    UPDATE_SUB_TASK_STATUS,
    DELETE_SUB_TASK,
} from "@/mutations/subTaskMutations";
import type { SubTask } from "@/types/subTaskTypes";
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

export const getSubTasks = async (taskId: string): Promise<SubTask[]> => {
    const response: AxiosResponse<GraphqlResponse<{ subTasks: SubTask[] }>> = await api.post("", {
        query: GET_SUB_TASKS,
        variables: { taskId },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.subTasks;
};

export const createSubTask = async (vars: {
    title: string;
    taskId: string;
    assignedTo?: string;
    deadline?: string;
    priority?: string;
}): Promise<SubTask> => {
    const response: AxiosResponse<GraphqlResponse<{ createSubTask: SubTask }>> = await api.post("", {
        query: CREATE_SUB_TASK,
        variables: vars,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.createSubTask;
};

export const updateSubTask = async (vars: {
    id: string;
    title?: string;
    assignedTo?: string;
    deadline?: string;
    priority?: string;
}): Promise<SubTask> => {
    const response: AxiosResponse<GraphqlResponse<{ updateSubTask: SubTask }>> = await api.post("", {
        query: UPDATE_SUB_TASK,
        variables: vars,
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.updateSubTask;
};

export const updateSubTaskStatus = async (id: string, status: string): Promise<SubTask> => {
    const response: AxiosResponse<GraphqlResponse<{ updateSubTaskStatus: SubTask }>> = await api.post("", {
        query: UPDATE_SUB_TASK_STATUS,
        variables: { id, status },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
    return response.data.data.updateSubTaskStatus;
};

export const deleteSubTask = async (id: string): Promise<void> => {
    const response: AxiosResponse<GraphqlResponse<{ deleteSubTask: { id: string } }>> = await api.post("", {
        query: DELETE_SUB_TASK,
        variables: { id },
    });
    if (response.data.errors) throw new Error(response.data.errors[0].message);
};
