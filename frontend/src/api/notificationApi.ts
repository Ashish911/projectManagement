import axios, { AxiosResponse } from "axios";
import { GET_NOTIFICATIONS } from "@/queries/notificationQueries";
import {
    MARK_AS_READ,
    MARK_ALL_AS_READ,
    DELETE_NOTIFICATION,
    DELETE_ALL_NOTIFICATIONS,
} from "@/mutations/notificationMutations";
import type { GraphqlResponse } from "@/types/genericTypes";

export interface Notification {
    id: string;
    content: string;
    status: "READ" | "UNREAD";
    createdAt: string;
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const getNotifications = async (): Promise<Notification[]> => {
    const res: AxiosResponse<GraphqlResponse<{ notifications: Notification[] }>> = await api.post("", {
        query: GET_NOTIFICATIONS,
    });
    if (res.data.errors) throw new Error(res.data.errors[0].message);
    return res.data.data.notifications;
};

export const markAsRead = async (id: string): Promise<void> => {
    const res: AxiosResponse<GraphqlResponse<{ markAsRead: Notification }>> = await api.post("", {
        query: MARK_AS_READ,
        variables: { id },
    });
    if (res.data.errors) throw new Error(res.data.errors[0].message);
};

export const markAllAsRead = async (): Promise<void> => {
    const res: AxiosResponse<GraphqlResponse<{ markAllAsRead: Notification[] }>> = await api.post("", {
        query: MARK_ALL_AS_READ,
    });
    if (res.data.errors) throw new Error(res.data.errors[0].message);
};

export const deleteNotification = async (id: string): Promise<void> => {
    const res: AxiosResponse<GraphqlResponse<{ deleteNotification: Notification }>> = await api.post("", {
        query: DELETE_NOTIFICATION,
        variables: { id },
    });
    if (res.data.errors) throw new Error(res.data.errors[0].message);
};

export const deleteAllNotifications = async (): Promise<void> => {
    const res: AxiosResponse<GraphqlResponse<{ deleteAllNotifications: Notification[] }>> = await api.post("", {
        query: DELETE_ALL_NOTIFICATIONS,
    });
    if (res.data.errors) throw new Error(res.data.errors[0].message);
};
