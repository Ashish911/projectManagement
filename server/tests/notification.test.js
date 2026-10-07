// tests/notification.service.test.js
import { jest } from "@jest/globals";

// ─── Mock functions ───────────────────────────────────────────────
const mockFind = jest.fn();
const mockFindById = jest.fn();
const mockFindByUser = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockMarkRead = jest.fn();
const mockDeleteByUser = jest.fn();
const mockQueueAdd = jest.fn();
const mockPublish = jest.fn().mockResolvedValue(true);

// ─── Mock the modules ─────────────────────────────────────────────
jest.unstable_mockModule("../repositories/notification.repo.js", () => ({
  NotificationRepo: {
    find: mockFind,
    findById: mockFindById,
    findByUser: mockFindByUser,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
    markRead: mockMarkRead,
    deleteByUser: mockDeleteByUser,
  },
}));

jest.unstable_mockModule("../config/pubsub.js", () => ({
  default: { publish: mockPublish },
  NOTIFICATION_CREATED: "NOTIFICATION_CREATED",
}));

jest.unstable_mockModule("../queues/notification.queue.js", () => ({
  NOTIFICATION_QUEUE: "notifications",
  getNotificationQueue: () => ({ add: mockQueueAdd }),
}));

// The worker module connects to MongoDB only when started, so importing it is safe
jest.unstable_mockModule("../config/db.js", () => ({ default: jest.fn() }));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { NotificationService } =
  await import("../services/notification.service.js");
const { processNotificationJob } =
  await import("../worker/notification.worker.js");

// ─── Mock Data ────────────────────────────────────────────────────
const mockSuperAdmin = {
  id: "648a1b2c3d4e5f6a7b8c9d0f",
  role: "SUPER_ADMIN",
};

const mockUser = {
  id: "648a1b2c3d4e5f6a7b8c9d0e",
  role: "USER",
};

const mockNotification = {
  _id: "748a1b2c3d4e5f6a7b8c9d0e",
  content: "You have been assigned a new task",
  status: "UNREAD",
  user: "648a1b2c3d4e5f6a7b8c9d0e",
};

const mockReadNotification = {
  ...mockNotification,
  status: "READ",
};

// ─── Tests ────────────────────────────────────────────────────────
describe("NotificationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════
  // NOTIFY (internal method)
  // ════════════════════════════════════════════════════════════════
  describe("notify", () => {
    it("🟢 should queue the notification for the worker", async () => {
      mockQueueAdd.mockResolvedValue({ id: "1" });

      await NotificationService.notify(mockUser.id, "You have been assigned a new task");

      expect(mockQueueAdd).toHaveBeenCalledWith("notify", {
        user: mockUser.id,
        content: "You have been assigned a new task",
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("🟢 should send ObjectId recipients as strings", async () => {
      mockQueueAdd.mockResolvedValue({ id: "1" });
      const objectIdLike = { toString: () => mockUser.id };

      await NotificationService.notify(objectIdLike, "Hi");

      expect(mockQueueAdd).toHaveBeenCalledWith("notify", { user: mockUser.id, content: "Hi" });
    });

    it("🔴 should save directly when the queue is unavailable", async () => {
      mockQueueAdd.mockRejectedValue(new Error("Connection is closed."));
      mockCreate.mockResolvedValue(mockNotification);

      await NotificationService.notify(mockUser.id, "Test notification");

      expect(mockCreate).toHaveBeenCalledWith({
        content: "Test notification",
        status: "UNREAD",
        user: mockUser.id,
      });
      expect(mockPublish).toHaveBeenCalled();
    });

    it("🔴 should save directly when the queue hangs (Redis unreachable)", async () => {
      jest.useFakeTimers();
      try {
        mockQueueAdd.mockReturnValue(new Promise(() => {})); // Never settles
        mockCreate.mockResolvedValue(mockNotification);

        const pending = NotificationService.notify(mockUser.id, "Slow queue");
        await jest.advanceTimersByTimeAsync(3000);
        await pending;

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({ content: "Slow queue", user: mockUser.id }),
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // ════════════════════════════════════════════════════════════════
  // DELIVER (worker)
  // ════════════════════════════════════════════════════════════════
  describe("deliver", () => {
    it("🟢 should save an UNREAD notification and publish it to the user", async () => {
      mockCreate.mockResolvedValue(mockNotification);

      const result = await NotificationService.deliver(mockUser.id, "Hello");

      expect(mockCreate).toHaveBeenCalledWith({ content: "Hello", status: "UNREAD", user: mockUser.id });
      expect(mockPublish).toHaveBeenCalledWith(`NOTIFICATION_CREATED:${mockUser.id}`, {
        notificationCreated: mockNotification,
      });
      expect(result).toEqual(mockNotification);
    });

    it("🟢 should still return the notification if publishing fails", async () => {
      mockCreate.mockResolvedValue(mockNotification);
      mockPublish.mockRejectedValueOnce(new Error("Redis down"));

      await expect(NotificationService.deliver(mockUser.id, "Hello")).resolves.toEqual(mockNotification);
    });

    it("🟢 worker job should deliver the queued notification", async () => {
      mockCreate.mockResolvedValue(mockNotification);

      const result = await processNotificationJob({ id: "7", data: { user: mockUser.id, content: "Queued" } });

      expect(mockCreate).toHaveBeenCalledWith({ content: "Queued", status: "UNREAD", user: mockUser.id });
      expect(result).toEqual(mockNotification);
    });

    it("🔴 worker job should fail (so BullMQ retries) when saving fails", async () => {
      mockCreate.mockRejectedValue(new Error("Mongo down"));

      await expect(
        processNotificationJob({ id: "8", data: { user: mockUser.id, content: "Queued" } }),
      ).rejects.toThrow("Mongo down");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // GET NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════
  describe("getNotifications", () => {
    it("🟢 should return all notifications for a user", async () => {
      mockFindByUser.mockResolvedValue([mockNotification]);

      const result = await NotificationService.getNotifications({
        user: mockUser,
      });

      expect(result).toEqual([mockNotification]);
      expect(mockFindByUser).toHaveBeenCalledWith(mockUser.id);
    });

    it("🟢 should return multiple notifications", async () => {
      const multipleNotifications = [
        mockNotification,
        {
          ...mockNotification,
          _id: "748a1b2c3d4e5f6a7b8c9d0f",
          content: "Task completed",
        },
      ];
      mockFindByUser.mockResolvedValue(multipleNotifications);

      const result = await NotificationService.getNotifications({
        user: mockUser,
      });

      expect(result).toHaveLength(2);
    });

    it("🟢 should return an empty list if the user has none", async () => {
      mockFindByUser.mockResolvedValue([]);

      await expect(
        NotificationService.getNotifications({ user: mockUser }),
      ).resolves.toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // GET NOTIFICATION
  // ════════════════════════════════════════════════════════════════
  describe("getNotification", () => {
    it("🟢 should return a notification by id", async () => {
      mockFindById.mockResolvedValue(mockNotification);

      const result = await NotificationService.getNotification(
        mockNotification._id,
        { user: mockUser },
      );

      expect(result).toEqual(mockNotification);
    });

    it("🔴 should throw if notification not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        NotificationService.getNotification("748a1b2c3d4e5f6a7b8c9d01", {
          user: mockUser,
        }),
      ).rejects.toThrow("Notification not found.");
    });

    it("🔴 should throw if notification id is invalid", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        NotificationService.getNotification("nonexistent", { user: mockUser }),
      ).rejects.toThrow("Invalid ID format");
    });

    it("🔴 should throw if notification belongs to another user", async () => {
      mockFindById.mockResolvedValue({
        ...mockNotification,
        user: "differentuser123456789",
      });

      await expect(
        NotificationService.getNotification(mockNotification._id, {
          user: mockUser,
        }),
      ).rejects.toThrow("You do not have access to this notification");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // MARK AS READ
  // ════════════════════════════════════════════════════════════════
  describe("markAsRead", () => {
    it("🟢 should mark a notification as read", async () => {
      mockFindById.mockResolvedValue(mockNotification);
      mockUpdate.mockResolvedValue(mockReadNotification);

      const result = await NotificationService.markAsRead(
        mockNotification._id,
        { user: mockUser },
      );

      expect(mockUpdate).toHaveBeenCalledWith(mockNotification._id, {
        status: "READ",
      });
      expect(result.status).toBe("READ");
    });

    it("🔴 should throw if notification not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        NotificationService.markAsRead("748a1b2c3d4e5f6a7b8c9d01", {
          user: mockUser,
        }),
      ).rejects.toThrow("Notification not found.");
    });

    it("🔴 should throw if notification id is invalid", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        NotificationService.markAsRead("nonexistent", { user: mockUser }),
      ).rejects.toThrow("Invalid ID format");
    });

    it("🔴 should throw if notification belongs to another user", async () => {
      mockFindById.mockResolvedValue({
        ...mockNotification,
        user: "differentuser123456789",
      });

      await expect(
        NotificationService.markAsRead(mockNotification._id, {
          user: mockUser,
        }),
      ).rejects.toThrow("You do not have access to this notification");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // MARK ALL AS READ
  // ════════════════════════════════════════════════════════════════
  describe("markAllAsRead", () => {
    it("🟢 should mark all unread notifications read in one write", async () => {
      mockFindByUser.mockResolvedValue([mockReadNotification]);

      const result = await NotificationService.markAllAsRead({ user: mockUser });

      expect(mockMarkRead).toHaveBeenCalledTimes(1);
      expect(mockMarkRead).toHaveBeenCalledWith(mockUser.id);
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(result).toEqual([mockReadNotification]);
    });

    it("🟢 should succeed when nothing is unread", async () => {
      mockFindByUser.mockResolvedValue([]);

      await expect(NotificationService.markAllAsRead({ user: mockUser })).resolves.toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // MARK NOTIFICATIONS READ (bulk by id)
  // ════════════════════════════════════════════════════════════════
  describe("markNotificationsRead", () => {
    const ids = ["748a1b2c3d4e5f6a7b8c9d0e", "748a1b2c3d4e5f6a7b8c9d0f"];

    it("🟢 should mark the given notifications read in one write, scoped to the user", async () => {
      mockFindByUser.mockResolvedValue([mockReadNotification]);

      const result = await NotificationService.markNotificationsRead(ids, { user: mockUser });

      expect(mockMarkRead).toHaveBeenCalledTimes(1);
      expect(mockMarkRead).toHaveBeenCalledWith(mockUser.id, ids);
      expect(result).toEqual([mockReadNotification]);
    });

    it("🔴 should reject an empty list", async () => {
      await expect(
        NotificationService.markNotificationsRead([], { user: mockUser }),
      ).rejects.toThrow("Select at least one notification");
      expect(mockMarkRead).not.toHaveBeenCalled();
    });

    it("🔴 should reject an invalid id", async () => {
      await expect(
        NotificationService.markNotificationsRead(["bad"], { user: mockUser }),
      ).rejects.toThrow();
      expect(mockMarkRead).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // DELETE NOTIFICATION
  // ════════════════════════════════════════════════════════════════
  describe("deleteNotification", () => {
    it("🟢 user should delete their own notification", async () => {
      mockFindById.mockResolvedValue(mockNotification);
      mockDelete.mockResolvedValue(mockNotification);

      const result = await NotificationService.deleteNotification(
        mockNotification._id,
        { user: mockUser },
      );

      expect(mockDelete).toHaveBeenCalledWith(mockNotification._id);
      expect(result).toEqual(mockNotification);
    });

    it("🟢 SUPER_ADMIN should delete any notification", async () => {
      mockFindById.mockResolvedValue(mockNotification);
      mockDelete.mockResolvedValue(mockNotification);

      const result = await NotificationService.deleteNotification(
        mockNotification._id,
        { user: mockSuperAdmin },
      );

      expect(mockDelete).toHaveBeenCalled();
    });

    it("🔴 should throw if notification not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        NotificationService.deleteNotification("648a1b2c3d4e5f6a7b8c9d0f", {
          user: mockUser,
        }),
      ).rejects.toThrow("Notification not found.");
    });

    it("🔴 should throw if notification id is invalid", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        NotificationService.deleteNotification("nonexistent", {
          user: mockUser,
        }),
      ).rejects.toThrow("Invalid ID format");
    });

    it("🔴 user should not delete another user's notification", async () => {
      mockFindById.mockResolvedValue({
        ...mockNotification,
        user: "differentuser123456789",
      });

      await expect(
        NotificationService.deleteNotification(mockNotification._id, {
          user: mockUser,
        }),
      ).rejects.toThrow(
        "You do not have permission to delete this notification",
      );
    });

    it("🔴 should not call delete if notification not found", async () => {
      mockFindById.mockResolvedValue(null);

      try {
        await NotificationService.deleteNotification("nonexistent", {
          user: mockUser,
        });
      } catch (e) {}

      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // DELETE ALL NOTIFICATIONS
  // ════════════════════════════════════════════════════════════════
  describe("deleteAllNotifications", () => {
    it("🟢 should delete all notifications for a user", async () => {
      const notifications = [
        mockNotification,
        { ...mockNotification, _id: "748a1b2c3d4e5f6a7b8c9d0f" },
      ];
      mockFindByUser.mockResolvedValue(notifications);

      const result = await NotificationService.deleteAllNotifications({
        user: mockUser,
      });

      expect(mockDeleteByUser).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(notifications);
    });

    it("🔴 should throw if no notifications found", async () => {
      mockFindByUser.mockResolvedValue([]);

      await expect(
        NotificationService.deleteAllNotifications({ user: mockUser }),
      ).rejects.toThrow("No notifications found.");
    });

    it("🔴 should not call delete if no notifications found", async () => {
      mockFindByUser.mockResolvedValue([]);

      try {
        await NotificationService.deleteAllNotifications({ user: mockUser });
      } catch (e) {}

      expect(mockDeleteByUser).not.toHaveBeenCalled();
    });
  });
});
