// tests/notification.service.test.js
import { jest } from "@jest/globals";

// ─── Mock functions ───────────────────────────────────────────────
const mockFind = jest.fn();
const mockFindById = jest.fn();
const mockFindByUser = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

// ─── Mock the modules ─────────────────────────────────────────────
jest.unstable_mockModule("../repositories/notification.repo.js", () => ({
  NotificationRepo: {
    find: mockFind,
    findById: mockFindById,
    findByUser: mockFindByUser,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

jest.unstable_mockModule("../config/pubsub.js", () => ({
  default: { publish: jest.fn().mockResolvedValue(true) },
  NOTIFICATION_CREATED: "NOTIFICATION_CREATED",
}));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { NotificationService } =
  await import("../services/notification.service.js");

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
    it("🟢 should create a notification for a user", async () => {
      mockCreate.mockResolvedValue(mockNotification);

      const result = await NotificationService.notify(
        mockUser.id,
        "You have been assigned a new task",
      );

      expect(mockCreate).toHaveBeenCalledWith({
        content: "You have been assigned a new task",
        status: "UNREAD",
        user: mockUser.id,
      });
      expect(result).toEqual(mockNotification);
    });

    it("🟢 should always create notification with UNREAD status", async () => {
      mockCreate.mockResolvedValue(mockNotification);

      await NotificationService.notify(mockUser.id, "Test notification");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ status: "UNREAD" }),
      );
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

    it("🔴 should throw if no notifications found", async () => {
      mockFindByUser.mockResolvedValue([]);

      await expect(
        NotificationService.getNotifications({ user: mockUser }),
      ).rejects.toThrow("No notifications found.");
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
    it("🟢 should mark all unread notifications as read", async () => {
      const unreadNotifications = [
        mockNotification,
        { ...mockNotification, _id: "748a1b2c3d4e5f6a7b8c9d0f" },
      ];
      mockFindByUser
        .mockResolvedValueOnce(unreadNotifications) // first call
        .mockResolvedValueOnce([
          // second call after update
          { ...mockNotification, status: "READ" },
          {
            ...mockNotification,
            _id: "748a1b2c3d4e5f6a7b8c9d0f",
            status: "READ",
          },
        ]);
      mockUpdate.mockResolvedValue(mockReadNotification);

      const result = await NotificationService.markAllAsRead({
        user: mockUser,
      });

      expect(mockUpdate).toHaveBeenCalledTimes(2);
      expect(result.every((n) => n.status === "READ")).toBe(true);
    });

    it("🔴 should throw if no notifications found", async () => {
      mockFindByUser.mockResolvedValue([]);

      await expect(
        NotificationService.markAllAsRead({ user: mockUser }),
      ).rejects.toThrow("No notifications found.");
    });

    it("🔴 should throw if no unread notifications", async () => {
      mockFindByUser.mockResolvedValue([mockReadNotification]);

      await expect(
        NotificationService.markAllAsRead({ user: mockUser }),
      ).rejects.toThrow("No unread notifications found");
    });

    it("🟢 should only update unread notifications", async () => {
      const mixed = [
        mockNotification, // UNREAD
        mockReadNotification, // READ - should be skipped
        { ...mockNotification, _id: "748a1b2c3d4e5f6a7b8c9d1b" }, // UNREAD
      ];
      mockFindByUser
        .mockResolvedValueOnce(mixed)
        .mockResolvedValueOnce(mixed.map((n) => ({ ...n, status: "READ" })));
      mockUpdate.mockResolvedValue(mockReadNotification);

      await NotificationService.markAllAsRead({ user: mockUser });

      // Should only update the 2 UNREAD ones not the READ one
      expect(mockUpdate).toHaveBeenCalledTimes(2);
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
      mockDelete.mockResolvedValue(mockNotification);

      const result = await NotificationService.deleteAllNotifications({
        user: mockUser,
      });

      expect(mockDelete).toHaveBeenCalledTimes(2);
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

      expect(mockDelete).not.toHaveBeenCalled();
    });
  });
});
