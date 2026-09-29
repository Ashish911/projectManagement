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
