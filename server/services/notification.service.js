import { NotificationRepo } from "../repositories/import.repo.js";

export const NotificationService = {
  // Internal method, called by other services not by resolvers
  async notify(userId, content) {
    return await NotificationRepo.create({
      content,
      status: "UNREAD",
      user: userId,
    });
  },

  async getNotifications(context) {
    const { user } = context;

    return await NotificationRepo.findByUser(user.id).orElseThrow(
      new Error("No notifications found"),
    );
  },

  async getNotification(id, context) {
    const { user } = context;

    const notification = await NotificationRepo.findById(id).orElseThrow(
      new Error("Notification not found"),
    );

    if (notification.user.toString() !== user.id) {
      throw new Error("You do not have access to this notification");
    }

    return notification;
  },

  async markAsRead(id, context) {
    const { user } = context;

    const notification = await NotificationRepo.findById(id).orElseThrow(
      new Error("Notification not found"),
    );

    if (notification.user.toString() !== user.id) {
      throw new Error("You do not have access to this notification");
    }

    return await NotificationRepo.update(id, { status: "READ" });
  },

  async markAllAsRead(context) {
    const { user } = context;

    const notifications = await NotificationRepo.findByUser(
      user.id,
    ).orElseThrow(new Error("No notifications found"));

    const unread = notifications.filter((n) => n.status === "UNREAD");
    if (!unread.length) throw new Error("No unread notifications found");

    await Promise.all(
      unread.map((n) => NotificationRepo.update(n._id, { status: "READ" })),
    );

    return await NotificationRepo.findByUser(user.id);
  },

  async deleteNotification(id, context) {
    const { user } = context;

    const notification = await NotificationRepo.findById(id).orElseThrow(
      new Error("Notification not found"),
    );

    if (
      notification.user.toString() !== user.id &&
      user.role !== "SUPER_ADMIN"
    ) {
      throw new Error("You do not have permission to delete this notification");
    }

    return await NotificationRepo.delete(id);
  },

  async deleteAllNotifications(context) {
    const { user } = context;

    const notifications = await NotificationRepo.findByUser(
      user.id,
    ).orElseThrow(new Error("No notifications found"));

    await Promise.all(notifications.map((n) => NotificationRepo.delete(n._id)));

    return notifications;
  },
};
