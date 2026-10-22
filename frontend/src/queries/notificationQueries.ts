export const GET_NOTIFICATIONS = `
    query GetNotifications {
        notifications {
            id
            content
            status
            createdAt
        }
    }
`;

export const NOTIFICATION_CREATED = `
    subscription OnNotificationCreated {
        notificationCreated {
            id
            content
            status
            createdAt
        }
    }
`;
