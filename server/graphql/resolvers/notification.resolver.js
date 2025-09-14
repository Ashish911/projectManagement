

export const notificationResolvers = {
    Query: {
        notifications: async () => await NotificationService.getNotifications()
    },
    Mutation: {
        // addNotification
        // updateNotification
        // deleteNotification
    },
};