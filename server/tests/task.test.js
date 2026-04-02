import { jest } from "@jest/globals";
import { PreferenceRepo } from "../repositories/preference.repo.js";

// ─── Mock functions ───────────────────────────────────────────────
const mockTaskFind = jest.fn();
const mockTaskFindById = jest.fn();
const mockTaskFindByProject = jest.fn();
const mockTaskCreate = jest.fn();
const mockTaskUpdate = jest.fn();
const mockTaskDelete = jest.fn();

const mockProjectFindById = jest.fn();
const mockSubTaskFindByTask = jest.fn();
const mockSubTaskDelete = jest.fn();
const mockNotify = jest.fn();

// ─── Mock the modules ─────────────────────────────────────────────
jest.unstable_mockModule("../repositories/import.repo.js", () => ({
  TaskRepo: {
    find: mockTaskFind,
    findById: mockTaskFindById,
    findByProject: mockTaskFindByProject,
    create: mockTaskCreate,
    update: mockTaskUpdate,
    delete: mockTaskDelete,
  },
  ProjectRepo: {
    findById: mockProjectFindById,
  },
  SubTaskRepo: {
    findByTask: mockSubTaskFindByTask,
    delete: mockSubTaskDelete,
  },
  ClientRepo: {},
  PreferenceRepo: {},
  UserRepo: {},
}));

jest.unstable_mockModule("../services/notification.service.js", () => ({
  NotificationService: {
    notify: mockNotify,
  },
}));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { TaskService } = await import("../services/task.service.js");

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

const mockProject = {
  _id: "748a1b2c3d4e5f6a7b8c9d0e",
  name: "Test Project",
  assignedUser: ["648a1b2c3d4e5f6a7b8c9d0e"],
};

const mockTask = {
  _id: "848a1b2c3d4e5f6a7b8c9d0e",
  title: "Test Task",
  priority: "NORMAL",
  deadline: "2026-12-31",
  currentStatus: "NEW",
  assignedTo: "648a1b2c3d4e5f6a7b8c9d0e",
  createdBy: "648a1b2c3d4e5f6a7b8c9d1a",
  project: "748a1b2c3d4e5f6a7b8c9d0e",
};

const createTaskData = {
  title: "New Task",
  priority: "HIGH",
  deadline: "2026-12-31",
  projectId: "748a1b2c3d4e5f6a7b8c9d0e",
  assignedTo: "648a1b2c3d4e5f6a7b8c9d0e",
};

// ─── Tests ────────────────────────────────────────────────────────
describe("TaskService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════
  // GET TASKS
  // ════════════════════════════════════════════════════════════════
  describe("getTasks", () => {
    it("🟢 SUPER_ADMIN should get all tasks for a project", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockTaskFindByProject.mockResolvedValue([mockTask]);

      const result = await TaskService.getTasks(mockProject._id, {
        user: mockSuperAdmin,
      });

      expect(result).toEqual([mockTask]);
      expect(mockTaskFindByProject).toHaveBeenCalledWith(mockProject._id);
    });

    it("🟢 CLIENT_ADMIN should get all tasks for a project", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockTaskFindByProject.mockResolvedValue([mockTask]);

      const result = await TaskService.getTasks(mockProject._id, {
        user: mockClientAdmin,
      });

      expect(result).toEqual([mockTask]);
    });

    it("🟢 USER should get tasks if assigned to project", async () => {
      mockProjectFindById.mockResolvedValue({
        ...mockProject,
        assignedUser: [mockUser.id],
      });
      mockTaskFindByProject.mockResolvedValue([mockTask]);

      const result = await TaskService.getTasks(mockProject._id, {
        user: mockUser,
      });

      expect(result).toEqual([mockTask]);
    });

    it("🔴 USER should not get tasks if not assigned to project", async () => {
      mockProjectFindById.mockResolvedValue({
        ...mockProject,
        assignedUser: ["differentuser1234567"],
      });

      await expect(
        TaskService.getTasks(mockProject._id, { user: mockUser }),
      ).rejects.toThrow("You are not assigned to this project");
    });

    it("🔴 should throw if project not found", async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(
        TaskService.getTasks("648a1b2c3d4e5f6a7b8c9d0f", {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("Project not found");
    });

    it("🔴 should throw if project id is incorrect", async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(
        TaskService.getTasks("nonexistent", { user: mockSuperAdmin }),
      ).rejects.toThrow("Invalid ID format");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // GET TASK
  // ════════════════════════════════════════════════════════════════
  describe("getTask", () => {
    it("🟢 SUPER_ADMIN should get any task", async () => {
      mockTaskFindById.mockResolvedValue(mockTask);

      const result = await TaskService.getTask(mockTask._id, {
        user: mockSuperAdmin,
      });

      expect(result).toEqual(mockTask);
    });

    it("🟢 USER should get task they are assigned to", async () => {
      mockTaskFindById.mockResolvedValue({
        ...mockTask,
        assignedTo: mockUser.id,
      });

      const result = await TaskService.getTask(mockTask._id, {
        user: mockUser,
      });

      expect(result).toBeDefined();
    });

    it("🟢 USER should get task they created", async () => {
      mockTaskFindById.mockResolvedValue({
        ...mockTask,
        createdBy: mockUser.id,
      });

      const result = await TaskService.getTask(mockTask._id, {
        user: mockUser,
      });

      expect(result).toBeDefined();
    });

    it("🔴 USER should not get task they are not assigned to or created", async () => {
      mockTaskFindById.mockResolvedValue({
        ...mockTask,
        assignedTo: "differentuser1234567",
        createdBy: "differentuser1234568",
      });

      await expect(
        TaskService.getTask(mockTask._id, { user: mockUser }),
      ).rejects.toThrow("You do not have access to this task");
    });

    it("🔴 should throw if task not found", async () => {
      mockTaskFindById.mockResolvedValue(null);

      await expect(
        TaskService.getTask("648a1b2c3d4e5f6a7b8c9d0f", {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("Task not found");
    });

    it("🔴 should throw if task id is incorrect", async () => {
      mockTaskFindById.mockResolvedValue(null);

      await expect(
        TaskService.getTask("nonexistent", { user: mockSuperAdmin }),
      ).rejects.toThrow("Invalid ID format");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // CREATE TASK
  // ════════════════════════════════════════════════════════════════
  describe("createTask", () => {
    it("🟢 SUPER_ADMIN should create a task", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockTaskCreate.mockResolvedValue({
        ...createTaskData,
        _id: "848a1b2c3d4e5f6a7b8c9d0f",
      });
      mockNotify.mockResolvedValue({});

      const result = await TaskService.createTask(createTaskData, {
        user: mockSuperAdmin,
      });

      expect(result._id).toBeDefined();
      expect(mockTaskCreate).toHaveBeenCalled();
    });

    it("🟢 CLIENT_ADMIN should create a task", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockTaskCreate.mockResolvedValue({
        ...createTaskData,
        _id: "848a1b2c3d4e5f6a7b8c9d0f",
      });
      mockNotify.mockResolvedValue({});

      const result = await TaskService.createTask(createTaskData, {
        user: mockClientAdmin,
      });

      expect(result).toBeDefined();
    });

    it("🔴 USER should not create a task", async () => {
      await expect(
        TaskService.createTask(createTaskData, { user: mockUser }),
      ).rejects.toThrow(
        "Current role does not have permission to create tasks",
      );
    });

    it("🔴 should throw if project not found", async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(
        TaskService.createTask(createTaskData, { user: mockSuperAdmin }),
      ).rejects.toThrow("Project not found");
    });

    it("🟢 should notify assigned user when task is created", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockTaskCreate.mockResolvedValue({
        ...createTaskData,
        _id: "848a1b2c3d4e5f6a7b8c9d0f",
      });
      mockNotify.mockResolvedValue({});

      await TaskService.createTask(createTaskData, { user: mockSuperAdmin });

      expect(mockNotify).toHaveBeenCalledWith(
        createTaskData.assignedTo,
        expect.stringContaining("assigned"),
      );
    });

    it("🟢 should not notify if no user assigned", async () => {
      let createTaskData = {
        title: "New Task",
        priority: "HIGH",
        deadline: "2026-12-31",
        projectId: "748a1b2c3d4e5f6a7b8c9d0e",
      };

      mockProjectFindById.mockResolvedValue(mockProject);
      mockTaskCreate.mockResolvedValue({
        ...createTaskData,
        _id: "848a1b2c3d4e5f6a7b8c9d0f",
      });

      await TaskService.createTask(
        { ...createTaskData },
        { user: mockSuperAdmin },
      );

      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("🔴 should not call create if project not found", async () => {
      mockProjectFindById.mockResolvedValue(null);

      try {
        await TaskService.createTask(createTaskData, { user: mockSuperAdmin });
      } catch (e) {}

      expect(mockTaskCreate).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // UPDATE TASK
  // ════════════════════════════════════════════════════════════════
  describe("updateTask", () => {
    const updateData = {
      id: "848a1b2c3d4e5f6a7b8c9d0e",
      title: "Updated Task",
      priority: "URGENT",
      assignedTo: "648a1b2c3d4e5f6a7b8c9d1b",
    };

    it("🟢 SUPER_ADMIN should update any task", async () => {
      mockTaskFindById.mockResolvedValue(mockTask);
      mockTaskUpdate.mockResolvedValue({ ...mockTask, ...updateData });
      mockNotify.mockResolvedValue({});

      const result = await TaskService.updateTask(updateData, {
        user: mockSuperAdmin,
      });

      expect(result.title).toBe("Updated Task");
      expect(mockTaskUpdate).toHaveBeenCalled();
    });

    it("🟢 USER should update task assigned to them", async () => {
      mockTaskFindById.mockResolvedValue({
        ...mockTask,
        assignedTo: mockUser.id,
      });
      mockTaskUpdate.mockResolvedValue({ ...mockTask, ...updateData });
      mockNotify.mockResolvedValue({});

      const result = await TaskService.updateTask(updateData, {
        user: mockUser,
      });

      expect(result).toBeDefined();
    });

    it("🔴 USER should not update task not assigned to them", async () => {
      mockTaskFindById.mockResolvedValue({
        ...mockTask,
        assignedTo: "differentuser1234567",
      });

      await expect(
        TaskService.updateTask(updateData, { user: mockUser }),
      ).rejects.toThrow("You do not have permission to update this task");
    });

    it("🟢 should notify new assignee when task is reassigned", async () => {
      mockTaskFindById.mockResolvedValue(mockTask);
      mockTaskUpdate.mockResolvedValue({ ...mockTask, ...updateData });
      mockNotify.mockResolvedValue({});

      await TaskService.updateTask(updateData, { user: mockSuperAdmin });

      expect(mockNotify).toHaveBeenCalledWith(
        updateData.assignedTo,
        expect.stringContaining("assigned"),
      );
    });

    it("🟢 should not notify if assignee has not changed", async () => {
      mockTaskFindById.mockResolvedValue(mockTask);
      mockTaskUpdate.mockResolvedValue(mockTask);

      await TaskService.updateTask(
        { id: mockTask._id, title: "Updated Title" },
        { user: mockSuperAdmin },
      );

      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("🔴 should throw if task not found", async () => {
      mockTaskFindById.mockResolvedValue(null);

      await expect(
        TaskService.updateTask(updateData, { user: mockSuperAdmin }),
      ).rejects.toThrow("Task not found");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // UPDATE TASK STATUS
  // ════════════════════════════════════════════════════════════════
  describe("updateTaskStatus", () => {
    it("🟢 should update task status to IN_PROGRESS", async () => {
      mockTaskFindById.mockResolvedValue(mockTask);
      mockTaskUpdate.mockResolvedValue({
        ...mockTask,
        currentStatus: "IN_PROGRESS",
      });

      const result = await TaskService.updateTaskStatus(
        mockTask._id,
        "IN_PROGRESS",
        { user: mockSuperAdmin },
      );

      expect(mockTaskUpdate).toHaveBeenCalledWith(mockTask._id, {
        currentStatus: "IN_PROGRESS",
      });
    });

    it("🟢 should notify creator when task is resolved", async () => {
      mockTaskFindById.mockResolvedValue(mockTask);
      mockTaskUpdate.mockResolvedValue({
        ...mockTask,
        currentStatus: "RESOLVED",
      });
      mockNotify.mockResolvedValue({});

      await TaskService.updateTaskStatus(mockTask._id, "RESOLVED", {
        user: mockSuperAdmin,
      });

      expect(mockNotify).toHaveBeenCalledWith(
        mockTask.createdBy,
        expect.stringContaining("resolved"),
      );
    });

    it("🟢 should notify creator when task is reopened", async () => {
      mockTaskFindById.mockResolvedValue(mockTask);
      mockTaskUpdate.mockResolvedValue({
        ...mockTask,
        currentStatus: "REOPENED",
      });
      mockNotify.mockResolvedValue({});

      await TaskService.updateTaskStatus(mockTask._id, "REOPENED", {
        user: mockSuperAdmin,
      });

      expect(mockNotify).toHaveBeenCalledWith(
        mockTask.createdBy,
        expect.stringContaining("reopened"),
      );
    });

    it("🔴 USER should not update status of task not assigned to them", async () => {
      mockTaskFindById.mockResolvedValue({
        ...mockTask,
        assignedTo: "differentuser1234567",
      });

      await expect(
        TaskService.updateTaskStatus(mockTask._id, "IN_PROGRESS", {
          user: mockUser,
        }),
      ).rejects.toThrow(
        "You do not have permission to update this task status",
      );
    });

    it("🔴 should throw if task not found", async () => {
      mockTaskFindById.mockResolvedValue(null);

      await expect(
        TaskService.updateTaskStatus(
          "648a1b2c3d4e5f6a7b8c9d0f",
          "IN_PROGRESS",
          {
            user: mockSuperAdmin,
          },
        ),
      ).rejects.toThrow("Task not found");
    });

    it("🔴 should throw if task id is invalid", async () => {
      mockTaskFindById.mockResolvedValue(null);

      await expect(
        TaskService.updateTaskStatus("nonexistent", "IN_PROGRESS", {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("Invalid ID format");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // DELETE TASK
  // ════════════════════════════════════════════════════════════════
  describe("deleteTask", () => {
    it("🟢 SUPER_ADMIN should delete any task", async () => {
      mockTaskFindById.mockResolvedValue(mockTask);
      mockSubTaskFindByTask.mockResolvedValue([]);
      mockTaskDelete.mockResolvedValue(mockTask);
      mockNotify.mockResolvedValue({});

      const result = await TaskService.deleteTask(mockTask._id, {
        user: mockSuperAdmin,
      });

      expect(mockTaskDelete).toHaveBeenCalledWith(mockTask._id);
    });

    it("🟢 should delete all subtasks when task is deleted", async () => {
      const mockSubTasks = [
        { _id: "948a1b2c3d4e5f6a7b8c9d0e" },
        { _id: "948a1b2c3d4e5f6a7b8c9d0f" },
      ];
      mockTaskFindById.mockResolvedValue(mockTask);
      mockSubTaskFindByTask.mockResolvedValue(mockSubTasks);
      mockSubTaskDelete.mockResolvedValue({});
      mockTaskDelete.mockResolvedValue(mockTask);
      mockNotify.mockResolvedValue({});

      await TaskService.deleteTask(mockTask._id, { user: mockSuperAdmin });

      expect(mockSubTaskDelete).toHaveBeenCalledTimes(2);
    });

    it("🟢 should notify assigned user when task is deleted", async () => {
      mockTaskFindById.mockResolvedValue(mockTask);
      mockSubTaskFindByTask.mockResolvedValue([]);
      mockTaskDelete.mockResolvedValue(mockTask);
      mockNotify.mockResolvedValue({});

      await TaskService.deleteTask(mockTask._id, { user: mockSuperAdmin });

      expect(mockNotify).toHaveBeenCalledWith(
        mockTask.assignedTo,
        expect.stringContaining("deleted"),
      );
    });

    it("🔴 USER should not delete a task", async () => {
      await expect(
        TaskService.deleteTask(mockTask._id, { user: mockUser }),
      ).rejects.toThrow(
        "Current role does not have permission to delete tasks",
      );
    });

    it("🔴 should throw if task not found", async () => {
      mockTaskFindById.mockResolvedValue(null);

      await expect(
        TaskService.deleteTask("648a1b2c3d4e5f6a7b8c9d0f", {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("Task not found");
    });

    it("🔴 should throw if task id is invalid", async () => {
      mockTaskFindById.mockResolvedValue(null);

      await expect(
        TaskService.deleteTask("nonexistent", {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("Invalid ID format");
    });

    it("🔴 should not call delete if task not found", async () => {
      mockTaskFindById.mockResolvedValue(null);

      try {
        await TaskService.deleteTask("nonexistent", { user: mockSuperAdmin });
      } catch (e) {}

      expect(mockTaskDelete).not.toHaveBeenCalled();
    });
  });
});
