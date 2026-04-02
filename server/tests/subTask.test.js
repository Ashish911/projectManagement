import { jest } from "@jest/globals";

// ─── Mock functions ───────────────────────────────────────────────
const mockSubTaskFindById = jest.fn();
const mockSubTaskFindByTask = jest.fn();
const mockSubTaskCreate = jest.fn();
const mockSubTaskUpdate = jest.fn();
const mockSubTaskDelete = jest.fn();

const mockTaskFindById = jest.fn();
const mockNotify = jest.fn();

// ─── Mock the modules ─────────────────────────────────────────────
jest.unstable_mockModule("../repositories/import.repo.js", () => ({
  SubTaskRepo: {
    findById: mockSubTaskFindById,
    findByTask: mockSubTaskFindByTask,
    create: mockSubTaskCreate,
    update: mockSubTaskUpdate,
    delete: mockSubTaskDelete,
  },
  TaskRepo: {
    findById: mockTaskFindById,
  },
  ProjectRepo: {},
  PreferenceRepo: {},
  UserRepo: {},
  ClientRepo: {},
}));

jest.unstable_mockModule("../services/notification.service.js", () => ({
  NotificationService: {
    notify: mockNotify,
  },
}));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { SubTaskService } = await import("../services/subTask.service.js");

// ─── Mock Data ────────────────────────────────────────────────────
const mockSuperAdmin = {
  id: "648a1b2c3d4e5f6a7b8c9d0f",
  role: "SUPER_ADMIN",
};

const mockClientAdmin = {
  id: "648a1b2c3d4e5f6a7b8c9d1a",
  role: "CLIENT_ADMIN",
};

const mockUser = {
  id: "648a1b2c3d4e5f6a7b8c9d0e",
  role: "USER",
};

const mockTask = {
  _id: "748a1b2c3d4e5f6a7b8c9d0e",
  title: "Test Task",
  assignedTo: "648a1b2c3d4e5f6a7b8c9d0e",
  createdBy: "648a1b2c3d4e5f6a7b8c9d1a",
};

const mockSubTask = {
  _id: "848a1b2c3d4e5f6a7b8c9d0e",
  title: "Test SubTask",
  priority: "NORMAL",
  deadline: "2026-12-31",
  currentStatus: "NEW",
  assignedTo: "648a1b2c3d4e5f6a7b8c9d0e",
  createdBy: "648a1b2c3d4e5f6a7b8c9d1a",
  task: "748a1b2c3d4e5f6a7b8c9d0e",
};

const createSubTaskData = {
  title: "New SubTask",
  priority: "HIGH",
  deadline: "2026-12-31",
  taskId: "748a1b2c3d4e5f6a7b8c9d0e",
  assignedTo: "648a1b2c3d4e5f6a7b8c9d0e",
};

// ─── Tests ────────────────────────────────────────────────────────
describe("SubTaskService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════
  // GET SUBTASKS
  // ════════════════════════════════════════════════════════════════
  describe("getSubTasks", () => {
    it("🟢 SUPER_ADMIN should get all subtasks for a task", async () => {
      mockTaskFindById.mockResolvedValue(mockTask);
      mockSubTaskFindByTask.mockResolvedValue([mockSubTask]);

      const result = await SubTaskService.getSubTasks(mockTask._id, {
        user: mockSuperAdmin,
      });

      expect(result).toEqual([mockSubTask]);
      expect(mockSubTaskFindByTask).toHaveBeenCalledWith(mockTask._id);
    });

    it("🟢 USER should get subtasks if assigned to parent task", async () => {
      mockTaskFindById.mockResolvedValue({
        ...mockTask,
        assignedTo: mockUser.id,
      });
      mockSubTaskFindByTask.mockResolvedValue([mockSubTask]);

      const result = await SubTaskService.getSubTasks(mockTask._id, {
        user: mockUser,
      });

      expect(result).toEqual([mockSubTask]);
    });

    it("🟢 USER should get subtasks if they created the parent task", async () => {
      mockTaskFindById.mockResolvedValue({
        ...mockTask,
        createdBy: mockUser.id,
      });
      mockSubTaskFindByTask.mockResolvedValue([mockSubTask]);

      const result = await SubTaskService.getSubTasks(mockTask._id, {
        user: mockUser,
      });

      expect(result).toEqual([mockSubTask]);
    });

    it("🔴 USER should not get subtasks if not assigned to parent task", async () => {
      mockTaskFindById.mockResolvedValue({
        ...mockTask,
        assignedTo: "differentuser1234567",
        createdBy: "differentuser1234568",
      });

      await expect(
        SubTaskService.getSubTasks(mockTask._id, { user: mockUser }),
      ).rejects.toThrow("You do not have access to this task");
    });

    it("🔴 should throw if task not found", async () => {
      mockTaskFindById.mockResolvedValue(null);

      await expect(
        SubTaskService.getSubTasks("848a1b2c3d4e5f6a7b8c9d0f", {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("Task not found");
    });

    it("🔴 should throw if task id is invalid", async () => {
      mockTaskFindById.mockResolvedValue(null);

      await expect(
        SubTaskService.getSubTasks("non existent", { user: mockSuperAdmin }),
      ).rejects.toThrow("Invalid ID format");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // GET SUBTASK
  // ════════════════════════════════════════════════════════════════
  describe("getSubTask", () => {
    it("🟢 SUPER_ADMIN should get any subtask", async () => {
      mockSubTaskFindById.mockResolvedValue(mockSubTask);

      const result = await SubTaskService.getSubTask(mockSubTask._id, {
        user: mockSuperAdmin,
      });

      expect(result).toEqual(mockSubTask);
    });

    it("🟢 USER should get subtask they are assigned to", async () => {
      mockSubTaskFindById.mockResolvedValue({
        ...mockSubTask,
        assignedTo: mockUser.id,
      });

      const result = await SubTaskService.getSubTask(mockSubTask._id, {
        user: mockUser,
      });

      expect(result).toBeDefined();
    });

    it("🟢 USER should get subtask they created", async () => {
      mockSubTaskFindById.mockResolvedValue({
        ...mockSubTask,
        createdBy: mockUser.id,
      });

      const result = await SubTaskService.getSubTask(mockSubTask._id, {
        user: mockUser,
      });

      expect(result).toBeDefined();
    });

    it("🔴 USER should not get subtask they have no access to", async () => {
      mockSubTaskFindById.mockResolvedValue({
        ...mockSubTask,
        assignedTo: "differentuser1234567",
        createdBy: "differentuser1234568",
      });

      await expect(
        SubTaskService.getSubTask(mockSubTask._id, { user: mockUser }),
      ).rejects.toThrow("You do not have access to this subtask");
    });

    it("🔴 should throw if subtask not found", async () => {
      mockSubTaskFindById.mockResolvedValue(null);

      await expect(
        SubTaskService.getSubTask("848a1b2c3d4e5f6a7b8c9d01", {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("SubTask not found");
    });

    it("🔴 should throw if subtask id is invalid", async () => {
      mockSubTaskFindById.mockResolvedValue(null);

      await expect(
        SubTaskService.getSubTask("nonexistent", { user: mockSuperAdmin }),
      ).rejects.toThrow("Invalid ID format");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // CREATE SUBTASK
  // ════════════════════════════════════════════════════════════════
  describe("createSubTask", () => {
    it("🟢 SUPER_ADMIN should create a subtask", async () => {
      mockTaskFindById.mockResolvedValue(mockTask);
      mockSubTaskCreate.mockResolvedValue({
        ...createSubTaskData,
        _id: "848a1b2c3d4e5f6a7b8c9d0f",
      });
      mockNotify.mockResolvedValue({});

      const result = await SubTaskService.createSubTask(createSubTaskData, {
        user: mockSuperAdmin,
      });

      expect(result._id).toBeDefined();
      expect(mockSubTaskCreate).toHaveBeenCalled();
    });

    it("🟢 USER should create subtask if assigned to parent task", async () => {
      mockTaskFindById.mockResolvedValue({
        ...mockTask,
        assignedTo: mockUser.id,
      });
      mockSubTaskCreate.mockResolvedValue({
        ...createSubTaskData,
        _id: "848a1b2c3d4e5f6a7b8c9d0f",
      });
      mockNotify.mockResolvedValue({});

      const result = await SubTaskService.createSubTask(createSubTaskData, {
        user: mockUser,
      });

      expect(result).toBeDefined();
    });

    it("🔴 USER should not create subtask if not assigned to parent task", async () => {
      mockTaskFindById.mockResolvedValue({
        ...mockTask,
        assignedTo: "differentuser1234567",
      });

      await expect(
        SubTaskService.createSubTask(createSubTaskData, { user: mockUser }),
      ).rejects.toThrow(
        "You do not have permission to create subtasks for this task",
      );
    });

    it("🔴 should throw if parent task not found", async () => {
      mockTaskFindById.mockResolvedValue(null);

      await expect(
        SubTaskService.createSubTask(createSubTaskData, {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("Task not found");
    });

    it("🟢 should notify assigned user when subtask is created", async () => {
      mockTaskFindById.mockResolvedValue(mockTask);
      mockSubTaskCreate.mockResolvedValue({
        ...createSubTaskData,
        _id: "848a1b2c3d4e5f6a7b8c9d0f",
      });
      mockNotify.mockResolvedValue({});

      await SubTaskService.createSubTask(createSubTaskData, {
        user: mockSuperAdmin,
      });

      expect(mockNotify).toHaveBeenCalledWith(
        createSubTaskData.assignedTo,
        expect.stringContaining("assigned"),
      );
    });

    it("🟢 should not notify if no user assigned", async () => {
      let createSubTaskData = {
        title: "New SubTask",
        priority: "HIGH",
        deadline: "2026-12-31",
        taskId: "748a1b2c3d4e5f6a7b8c9d0e",
      };

      mockTaskFindById.mockResolvedValue(mockTask);
      mockSubTaskCreate.mockResolvedValue({
        ...createSubTaskData,
        _id: "848a1b2c3d4e5f6a7b8c9d0f",
      });

      await SubTaskService.createSubTask(
        { ...createSubTaskData },
        { user: mockSuperAdmin },
      );

      expect(mockNotify).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // UPDATE SUBTASK
  // ════════════════════════════════════════════════════════════════
  describe("updateSubTask", () => {
    const updateData = {
      id: "848a1b2c3d4e5f6a7b8c9d0e",
      title: "Updated SubTask",
      priority: "URGENT",
      assignedTo: "648a1b2c3d4e5f6a7b8c9d1b",
    };

    it("🟢 SUPER_ADMIN should update any subtask", async () => {
      mockSubTaskFindById.mockResolvedValue(mockSubTask);
      mockSubTaskUpdate.mockResolvedValue({ ...mockSubTask, ...updateData });
      mockNotify.mockResolvedValue({});

      const result = await SubTaskService.updateSubTask(updateData, {
        user: mockSuperAdmin,
      });

      expect(result.title).toBe("Updated SubTask");
      expect(mockSubTaskUpdate).toHaveBeenCalled();
    });

    it("🟢 USER should update subtask assigned to them", async () => {
      mockSubTaskFindById.mockResolvedValue({
        ...mockSubTask,
        assignedTo: mockUser.id,
      });
      mockSubTaskUpdate.mockResolvedValue({ ...mockSubTask, ...updateData });
      mockNotify.mockResolvedValue({});

      const result = await SubTaskService.updateSubTask(updateData, {
        user: mockUser,
      });

      expect(result).toBeDefined();
    });

    it("🔴 USER should not update subtask not assigned to them", async () => {
      mockSubTaskFindById.mockResolvedValue({
        ...mockSubTask,
        assignedTo: "differentuser1234567",
      });

      await expect(
        SubTaskService.updateSubTask(updateData, { user: mockUser }),
      ).rejects.toThrow("You do not have permission to update this subtask");
    });

    it("🟢 should notify new assignee when subtask is reassigned", async () => {
      mockSubTaskFindById.mockResolvedValue(mockSubTask);
      mockSubTaskUpdate.mockResolvedValue({ ...mockSubTask, ...updateData });
      mockNotify.mockResolvedValue({});

      await SubTaskService.updateSubTask(updateData, { user: mockSuperAdmin });

      expect(mockNotify).toHaveBeenCalledWith(
        updateData.assignedTo,
        expect.stringContaining("assigned"),
      );
    });

    it("🔴 should throw if subtask not found", async () => {
      mockSubTaskFindById.mockResolvedValue(null);

      await expect(
        SubTaskService.updateSubTask(updateData, { user: mockSuperAdmin }),
      ).rejects.toThrow("SubTask not found");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // UPDATE SUBTASK STATUS
  // ════════════════════════════════════════════════════════════════
  describe("updateSubTaskStatus", () => {
    it("🟢 should update subtask status to IN_PROGRESS", async () => {
      mockSubTaskFindById.mockResolvedValue(mockSubTask);
      mockSubTaskUpdate.mockResolvedValue({
        ...mockSubTask,
        currentStatus: "IN_PROGRESS",
      });

      await SubTaskService.updateSubTaskStatus(mockSubTask._id, "IN_PROGRESS", {
        user: mockSuperAdmin,
      });

      expect(mockSubTaskUpdate).toHaveBeenCalledWith(mockSubTask._id, {
        currentStatus: "IN_PROGRESS",
      });
    });

    it("🟢 should notify creator when subtask is resolved", async () => {
      mockSubTaskFindById.mockResolvedValue(mockSubTask);
      mockSubTaskUpdate.mockResolvedValue({
        ...mockSubTask,
        currentStatus: "RESOLVED",
      });
      mockNotify.mockResolvedValue({});

      await SubTaskService.updateSubTaskStatus(mockSubTask._id, "RESOLVED", {
        user: mockSuperAdmin,
      });

      expect(mockNotify).toHaveBeenCalledWith(
        mockSubTask.createdBy,
        expect.stringContaining("resolved"),
      );
    });

    it("🟢 should notify creator when subtask is reopened", async () => {
      mockSubTaskFindById.mockResolvedValue(mockSubTask);
      mockSubTaskUpdate.mockResolvedValue({
        ...mockSubTask,
        currentStatus: "REOPENED",
      });
      mockNotify.mockResolvedValue({});

      await SubTaskService.updateSubTaskStatus(mockSubTask._id, "REOPENED", {
        user: mockSuperAdmin,
      });

      expect(mockNotify).toHaveBeenCalledWith(
        mockSubTask.createdBy,
        expect.stringContaining("reopened"),
      );
    });

    it("🔴 USER should not update status of subtask not assigned to them", async () => {
      mockSubTaskFindById.mockResolvedValue({
        ...mockSubTask,
        assignedTo: "differentuser1234567",
      });

      await expect(
        SubTaskService.updateSubTaskStatus(mockSubTask._id, "IN_PROGRESS", {
          user: mockUser,
        }),
      ).rejects.toThrow(
        "You do not have permission to update this subtask status",
      );
    });

    it("🔴 should throw if subtask not found", async () => {
      mockSubTaskFindById.mockResolvedValue(null);

      await expect(
        SubTaskService.updateSubTaskStatus(
          "848a1b2c3d4e5f6a7b8c9d0e",
          "IN_PROGRESS",
          {
            user: mockSuperAdmin,
          },
        ),
      ).rejects.toThrow("SubTask not found");
    });

    it("🔴 should throw if subtask id is invalid", async () => {
      mockSubTaskFindById.mockResolvedValue(null);

      await expect(
        SubTaskService.updateSubTaskStatus("nonexistent", "IN_PROGRESS", {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("Invalid ID format");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // DELETE SUBTASK
  // ════════════════════════════════════════════════════════════════
  describe("deleteSubTask", () => {
    it("🟢 SUPER_ADMIN should delete any subtask", async () => {
      mockSubTaskFindById.mockResolvedValue(mockSubTask);
      mockSubTaskDelete.mockResolvedValue(mockSubTask);
      mockNotify.mockResolvedValue({});

      const result = await SubTaskService.deleteSubTask(mockSubTask._id, {
        user: mockSuperAdmin,
      });

      expect(mockSubTaskDelete).toHaveBeenCalledWith(mockSubTask._id);
    });

    it("🟢 USER should delete subtask they created", async () => {
      mockSubTaskFindById.mockResolvedValue({
        ...mockSubTask,
        createdBy: mockUser.id,
      });
      mockSubTaskDelete.mockResolvedValue(mockSubTask);
      mockNotify.mockResolvedValue({});

      await SubTaskService.deleteSubTask(mockSubTask._id, { user: mockUser });

      expect(mockSubTaskDelete).toHaveBeenCalled();
    });

    it("🔴 USER should not delete subtask they did not create", async () => {
      mockSubTaskFindById.mockResolvedValue({
        ...mockSubTask,
        createdBy: "differentuser1234567",
      });

      await expect(
        SubTaskService.deleteSubTask(mockSubTask._id, { user: mockUser }),
      ).rejects.toThrow("You do not have permission to delete this subtask");
    });

    it("🟢 should notify assigned user when subtask is deleted", async () => {
      mockSubTaskFindById.mockResolvedValue(mockSubTask);
      mockSubTaskDelete.mockResolvedValue(mockSubTask);
      mockNotify.mockResolvedValue({});

      await SubTaskService.deleteSubTask(mockSubTask._id, {
        user: mockSuperAdmin,
      });

      expect(mockNotify).toHaveBeenCalledWith(
        mockSubTask.assignedTo,
        expect.stringContaining("deleted"),
      );
    });

    it("🔴 should throw if subtask not found", async () => {
      mockSubTaskFindById.mockResolvedValue(null);

      await expect(
        SubTaskService.deleteSubTask("848a1b2c3d4e5f6a7b8c9d0e", {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("SubTask not found");
    });

    it("🔴 should throw if subtask is invalid", async () => {
      mockSubTaskFindById.mockResolvedValue(null);

      await expect(
        SubTaskService.deleteSubTask("nonexistent", { user: mockSuperAdmin }),
      ).rejects.toThrow("Invalid ID format");
    });

    it("🔴 should not call delete if subtask not found", async () => {
      mockSubTaskFindById.mockResolvedValue(null);

      try {
        await SubTaskService.deleteSubTask("nonexistent", {
          user: mockSuperAdmin,
        });
      } catch (e) {}

      expect(mockSubTaskDelete).not.toHaveBeenCalled();
    });
  });
});
