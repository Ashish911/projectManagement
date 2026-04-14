import { createLogger } from "../config/logger.js";
import { ForbiddenError, NotFoundError } from "../errors/errors.js";
import { NotificationRepo } from "../repositories/import.repo.js";
import { idSchema } from "../validation/schema.js";
import { validate } from "../validation/validate.js";

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

    const notification = await NotificationRepo.findByUser(user.id);

    if (notification.length === 0)
      throw new NotFoundError("No notifications found.");

    return notification;
  },

  async getNotification(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    const notification = await NotificationRepo.findById(id);

    if (!notification) throw new NotFoundError("Notification not found.");

    if (notification.user.toString() !== user.id) {
      throw new ForbiddenError("You do not have access to this notification");
    }

    return notification;
  },

  async markAsRead(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    const notification = await NotificationRepo.findById(id);

    if (!notification) throw new NotFoundError("Notification not found.");

    if (notification.user.toString() !== user.id) {
      throw new ForbiddenError("You do not have access to this notification");
    }

    return await NotificationRepo.update(id, { status: "READ" });
  },

  async markAllAsRead(context) {
    const { user } = context;

    const notifications = await NotificationRepo.findByUser(user.id);

    if (notifications.length === 0)
      throw new NotFoundError("No notifications found.");

    const unread = notifications.filter((n) => n.status === "UNREAD");
    if (!unread.length)
      throw new NotFoundError("No unread notifications found");

    await Promise.all(
      unread.map((n) => NotificationRepo.update(n._id, { status: "READ" })),
    );

    return await NotificationRepo.findByUser(user.id);
  },

  async deleteNotification(id, context) {
    validate(idSchema, { id });

    const { user } = context;
    const logger = createLogger(context);

    const notification = await NotificationRepo.findById(id);

    if (!notification) throw new NotFoundError("Notification not found.");

    if (
      notification.user.toString() !== user.id &&
      user.role !== "SUPER_ADMIN"
    ) {
      throw new ForbiddenError(
        "You do not have permission to delete this notification",
      );
    }

    const deleted = await NotificationRepo.delete(id);

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetClientId: id,
        action: "DELETE_NOTIFICATION",
      },
      "AUDIT",
    );

    return deleted;
  },

  async deleteAllNotifications(context) {
    const { user } = context;
    const logger = createLogger(context);

    const notifications = await NotificationRepo.findByUser(user.id);

    if (notifications.length === 0)
      throw new NotFoundError("No notifications found.");

    await Promise.all(notifications.map((n) => NotificationRepo.delete(n._id)));

    logger.info(
      {
        audit: true,
        userId: user.id,
        action: "DELETE_ALL_NOTIFICATIONS",
      },
      "AUDIT",
    );

    return notifications;
  },
};
