import { GET_NOTIFICATIONS, NOTIFICATION_CREATED } from "@/queries/notificationQueries";
import {
    MARK_AS_READ,
    MARK_ALL_AS_READ,
    MARK_NOTIFICATIONS_READ,
    DELETE_NOTIFICATION,
    DELETE_ALL_NOTIFICATIONS,
} from "@/mutations/notificationMutations";
import { gql } from "@/api/graphql";
import { subscribe } from "@/api/ws";

export interface Notification {
    id: string;
    content: string;
    status: "READ" | "UNREAD";
    /** ISO date */
    createdAt: string;
}

/** The current user's notifications, newest first. */
export const getNotifications = async (): Promise<Notification[]> =>
    (await gql<{ notifications: Notification[] }>(GET_NOTIFICATIONS)).notifications ?? [];

export const markAsRead = async (id: string): Promise<void> => {
    await gql(MARK_AS_READ, { id });
};

/** Marks every unread notification read in one request. */
export const markAllAsRead = async (): Promise<void> => {
    await gql(MARK_ALL_AS_READ);
};

/** Marks the given notifications read in one request. */
export const markNotificationsRead = async (ids: string[]): Promise<void> => {
    await gql(MARK_NOTIFICATIONS_READ, { ids });
};

export const deleteNotification = async (id: string): Promise<void> => {
    await gql(DELETE_NOTIFICATION, { id });
};

export const deleteAllNotifications = async (): Promise<void> => {
    await gql(DELETE_ALL_NOTIFICATIONS);
};

/** Calls `onNotification` for each notification pushed to the current user. Returns an unsubscribe function. */
export const subscribeToNotifications = (onNotification: (n: Notification) => void): (() => void) =>
    subscribe<{ notificationCreated: Notification }>(NOTIFICATION_CREATED, (d) => onNotification(d.notificationCreated));
