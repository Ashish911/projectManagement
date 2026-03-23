import { NotificationService } from "../../services/notification.service.js";

export const notificationResolvers = {
  Query: {
    notifications: async (_, args, context) =>
      await NotificationService.getNotifications(context),
    notification: async (_, { id }, context) =>
      await NotificationService.getNotification(id, context),
  },
  Mutation: {
    markAsRead: async (_, { id }, context) =>
      await NotificationService.markAsRead(id, context),
    markAllAsRead: async (_, args, context) =>
      await NotificationService.markAllAsRead(context),
    deleteNotification: async (_, { id }, context) =>
      await NotificationService.deleteNotification(id, context),
    deleteAllNotifications: async (_, args, context) =>
      await NotificationService.deleteAllNotifications(context),
  },
};
