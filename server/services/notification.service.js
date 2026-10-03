import logger, { createLogger } from "../config/logger.js";
import { ForbiddenError, NotFoundError } from "../errors/errors.js";
import { NotificationRepo } from "../repositories/import.repo.js";
import { idSchema } from "../validation/schema.js";
import { validate } from "../validation/validate.js";
import pubsub, { NOTIFICATION_CREATED } from "../config/pubsub.js";

/** In-app notifications: creation, live delivery, and per-user management. */
export const NotificationService = {
  /**
   * Saves a notification and pushes it to the user's `notificationCreated` subscription.
   * Internal: called by other services, not by resolvers.
   * @param {string} userId  Recipient user ID.
   * @param {string} content Message text.
   * @returns {Promise<object>} The saved notification.
   */
  async notify(userId, content) {
    const notification = await NotificationRepo.create({
      content,
      status: "UNREAD",
      user: userId,
    });

    // Fire-and-forget: notification is persisted regardless of Redis availability
    pubsub
      .publish(`${NOTIFICATION_CREATED}:${userId}`, {
        notificationCreated: notification,
      })
      .catch((err) => logger.error({ err }, "PubSub publish failed"));

    return notification;
  },

  /**
   * Lists the current user's notifications.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object[]>} The user's notifications.
   * @throws {NotFoundError} If the user has none.
   */
  async getNotifications(context) {
    const { user } = context;

    const notification = await NotificationRepo.findByUser(user.id);

    if (notification.length === 0)
      throw new NotFoundError("No notifications found.");

    return notification;
  },

  /**
   * Fetches one notification owned by the current user.
   * @param {string} id      Notification ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The notification.
   * @throws {ForbiddenError} If it belongs to another user.
   */
  async getNotification(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    const notification = await NotificationRepo.findById(id);

    if (!notification) throw new NotFoundError("Notification not found.");

    // Only the owner may read it
    if (notification.user.toString() !== user.id) {
      throw new ForbiddenError("You do not have access to this notification");
    }

    return notification;
  },

  /**
   * Marks one of the current user's notifications as read.
   * @param {string} id      Notification ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated notification.
   */
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

  /**
   * Marks all of the current user's unread notifications as read.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object[]>} The user's notifications after the update.
   * @throws {NotFoundError} If there are no notifications, or none unread.
   */
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

    // Re-fetch so the response reflects the new statuses
    return await NotificationRepo.findByUser(user.id);
  },

  /**
   * Deletes a notification. Allowed for its owner or a SUPER_ADMIN.
   * @param {string} id      Notification ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The deleted notification.
   * @throws {ForbiddenError} If the user is neither the owner nor a SUPER_ADMIN.
   */
  async deleteNotification(id, context) {
    validate(idSchema, { id });

    const { user } = context;
    const logger = createLogger(context);

    const notification = await NotificationRepo.findById(id);

    if (!notification) throw new NotFoundError("Notification not found.");

    // Owner or SUPER_ADMIN only
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

  /**
   * Deletes all of the current user's notifications.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object[]>} The notifications that were deleted.
   * @throws {NotFoundError} If the user has none.
   */
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
