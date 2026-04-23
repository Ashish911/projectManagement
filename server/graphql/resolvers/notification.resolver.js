import { NotificationService } from "../../services/notification.service.js";
import pubsub, { NOTIFICATION_CREATED } from "../../config/pubsub.js";
import { withFilter } from "graphql-subscriptions";

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

  Subscription: {
    notificationCreated: {
      subscribe: withFilter(
        (_, __, context) => {
          if (!context?.user) throw new Error("Unauthorized");
          return pubsub.asyncIterator(
            `${NOTIFICATION_CREATED}:${context.user.id}`,
          );
        },
        (payload, _, context) =>
          payload.notificationCreated?.user?.toString() === context?.user?.id,
      ),
      resolve: (payload) => payload.notificationCreated,
    },
  },
};
