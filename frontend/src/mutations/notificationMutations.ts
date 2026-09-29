export const MARK_AS_READ = `
    mutation MarkAsRead($id: ID!) {
        markAsRead(id: $id) {
            id
            status
        }
    }
`;

export const MARK_ALL_AS_READ = `
    mutation MarkAllAsRead {
        markAllAsRead {
            id
            status
        }
    }
`;

export const DELETE_NOTIFICATION = `
    mutation DeleteNotification($id: ID!) {
        deleteNotification(id: $id) {
            id
        }
    }
`;

export const DELETE_ALL_NOTIFICATIONS = `
    mutation DeleteAllNotifications {
        deleteAllNotifications {
            id
        }
    }
`;
