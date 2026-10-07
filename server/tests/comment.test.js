import { jest } from "@jest/globals";

// ─── Mock functions ───────────────────────────────────────────────
const mockCommentFindById = jest.fn();
const mockCommentFindByTask = jest.fn();
const mockCommentFindBySubTask = jest.fn();
const mockCommentCreate = jest.fn();
const mockCommentUpdate = jest.fn();
const mockCommentDelete = jest.fn();

const mockTaskFindById = jest.fn();
const mockSubTaskFindById = jest.fn();
const mockProjectFindById = jest.fn();
const mockClientFindByAssignedAdmin = jest.fn();
const mockNotify = jest.fn();

// ─── Mock the modules ─────────────────────────────────────────────
jest.unstable_mockModule("../repositories/import.repo.js", () => ({
  CommentRepo: {
    findById: mockCommentFindById,
    findByTask: mockCommentFindByTask,
    findBySubTask: mockCommentFindBySubTask,
    create: mockCommentCreate,
    update: mockCommentUpdate,
    delete: mockCommentDelete,
  },
  TaskRepo: { findById: mockTaskFindById },
  SubTaskRepo: { findById: mockSubTaskFindById },
  ProjectRepo: { findById: mockProjectFindById },
  ClientRepo: { findByAssignedAdmin: mockClientFindByAssignedAdmin },
  PreferenceRepo: {},
  UserRepo: {},
}));

jest.unstable_mockModule("../services/notification.service.js", () => ({
  NotificationService: {
    notify: mockNotify,
  },
}));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { CommentService } = await import("../services/comment.service.js");

// ─── Mock Data ────────────────────────────────────────────────────
const mockSuperAdmin = { id: "648a1b2c3d4e5f6a7b8c9d0f", role: "SUPER_ADMIN" };
const mockClientAdmin = { id: "648a1b2c3d4e5f6a7b8c9d1a", role: "CLIENT_ADMIN" };
const mockOtherClientAdmin = {
  id: "648a1b2c3d4e5f6a7b8c9d1b",
  role: "CLIENT_ADMIN",
};
const mockMember = { id: "648a1b2c3d4e5f6a7b8c9d0e", role: "USER" };
const mockOtherMember = { id: "648a1b2c3d4e5f6a7b8c9d2a", role: "USER" };
const mockOutsider = { id: "648a1b2c3d4e5f6a7b8c9d3a", role: "USER" };
const mockCreator = { id: "648a1b2c3d4e5f6a7b8c9d4a", role: "USER" };

const mockClient = { id: "548a1b2c3d4e5f6a7b8c9d0e" };
const mockOtherClient = { id: "548a1b2c3d4e5f6a7b8c9d0f" };

const mockProject = {
  id: "448a1b2c3d4e5f6a7b8c9d0e",
  clientId: mockClient.id,
  assignedUsers: [mockMember.id, mockOtherMember.id, mockCreator.id],
};

const mockTask = {
  id: "748a1b2c3d4e5f6a7b8c9d0e",
  title: "Test Task",
  assignedTo: mockMember.id,
  createdBy: mockCreator.id,
  project: mockProject.id,
};

const mockSubTask = {
  id: "848a1b2c3d4e5f6a7b8c9d0e",
  title: "Test SubTask",
  assignedTo: mockOtherMember.id,
  createdBy: mockMember.id,
  task: mockTask.id,
};

const mockComment = {
  id: "948a1b2c3d4e5f6a7b8c9d0e",
  content: "Looks good",
  userId: mockMember.id,
  taskId: mockTask.id,
};

// Resolves the task → project chain used by every access check
const setupTaskChain = () => {
  mockTaskFindById.mockResolvedValue(mockTask);
  mockProjectFindById.mockResolvedValue(mockProject);
};

const setupSubTaskChain = () => {
  mockSubTaskFindById.mockResolvedValue(mockSubTask);
  setupTaskChain();
};

describe("CommentService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotify.mockResolvedValue({});
    mockCommentCreate.mockImplementation(async (data) => ({
      id: mockComment.id,
      ...data,
    }));
  });

  // ════════════════════════════════════════════════════════════════
  // GET TASK COMMENTS
  // ════════════════════════════════════════════════════════════════
  describe("getTaskComments", () => {
    it("🟢 project member should list task comments", async () => {
      setupTaskChain();
      mockCommentFindByTask.mockResolvedValue([mockComment]);

      const result = await CommentService.getTaskComments(mockTask.id, {
        user: mockMember,
      });

      expect(result).toEqual([mockComment]);
      expect(mockCommentFindByTask).toHaveBeenCalledWith(mockTask.id);
    });

    it("🟢 SUPER_ADMIN should list task comments without being a member", async () => {
      setupTaskChain();
      mockCommentFindByTask.mockResolvedValue([]);

      await CommentService.getTaskComments(mockTask.id, {
        user: mockSuperAdmin,
      });

      expect(mockCommentFindByTask).toHaveBeenCalled();
      expect(mockClientFindByAssignedAdmin).not.toHaveBeenCalled();
    });

    it("🟢 CLIENT_ADMIN of the project's client should list task comments", async () => {
      setupTaskChain();
      mockClientFindByAssignedAdmin.mockResolvedValue(mockClient);
      mockCommentFindByTask.mockResolvedValue([]);

      await CommentService.getTaskComments(mockTask.id, {
        user: mockClientAdmin,
      });

      expect(mockCommentFindByTask).toHaveBeenCalled();
    });

    it("🔴 USER not assigned to the project should be rejected", async () => {
      setupTaskChain();

      await expect(
        CommentService.getTaskComments(mockTask.id, { user: mockOutsider }),
      ).rejects.toThrow("You are not a member of this project");
      expect(mockCommentFindByTask).not.toHaveBeenCalled();
    });

    it("🔴 CLIENT_ADMIN of a different client should be rejected", async () => {
      setupTaskChain();
      mockClientFindByAssignedAdmin.mockResolvedValue(mockOtherClient);

      await expect(
        CommentService.getTaskComments(mockTask.id, {
          user: mockOtherClientAdmin,
        }),
      ).rejects.toThrow("You are not a member of this project");
    });

    it("🔴 CLIENT_ADMIN with no client should be rejected", async () => {
      setupTaskChain();
      mockClientFindByAssignedAdmin.mockResolvedValue(null);

      await expect(
        CommentService.getTaskComments(mockTask.id, { user: mockClientAdmin }),
      ).rejects.toThrow("You are not a member of this project");
    });

    it("🔴 should throw if task not found", async () => {
      mockTaskFindById.mockResolvedValue(null);

      await expect(
        CommentService.getTaskComments(mockTask.id, { user: mockMember }),
      ).rejects.toThrow("Task not found");
    });

    it("🔴 should throw on invalid task ID", async () => {
      await expect(
        CommentService.getTaskComments("bad-id", { user: mockMember }),
      ).rejects.toThrow("Invalid ID format");
      expect(mockTaskFindById).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // GET SUBTASK COMMENTS
  // ════════════════════════════════════════════════════════════════
  describe("getSubTaskComments", () => {
    it("🟢 project member should list subtask comments", async () => {
      setupSubTaskChain();
      mockCommentFindBySubTask.mockResolvedValue([mockComment]);

      const result = await CommentService.getSubTaskComments(mockSubTask.id, {
        user: mockMember,
      });

      expect(result).toEqual([mockComment]);
      expect(mockTaskFindById).toHaveBeenCalledWith(mockSubTask.task);
      expect(mockCommentFindBySubTask).toHaveBeenCalledWith(mockSubTask.id);
    });

    it("🔴 USER not assigned to the project should be rejected", async () => {
      setupSubTaskChain();

      await expect(
        CommentService.getSubTaskComments(mockSubTask.id, {
          user: mockOutsider,
        }),
      ).rejects.toThrow("You are not a member of this project");
    });

    it("🔴 should throw if subtask not found", async () => {
      mockSubTaskFindById.mockResolvedValue(null);

      await expect(
        CommentService.getSubTaskComments(mockSubTask.id, { user: mockMember }),
      ).rejects.toThrow("SubTask not found");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // ADD TASK COMMENT
  // ════════════════════════════════════════════════════════════════
  describe("addTaskComment", () => {
    it("🟢 project member should add a comment to a task", async () => {
      setupTaskChain();

      const result = await CommentService.addTaskComment(
        { taskId: mockTask.id, content: "  Looks good  " },
        { user: mockMember },
      );

      expect(mockCommentCreate).toHaveBeenCalledWith({
        content: "Looks good",
        userId: mockMember.id,
        taskId: mockTask.id,
      });
      expect(result.content).toBe("Looks good");
    });

    it("🟢 should notify assignee and creator, but not the author", async () => {
      setupTaskChain();

      await CommentService.addTaskComment(
        { taskId: mockTask.id, content: "Hello" },
        { user: mockMember },
      );

      // mockMember is the assignee and the author, so only the creator is notified
      expect(mockNotify).toHaveBeenCalledTimes(1);
      expect(mockNotify).toHaveBeenCalledWith(
        mockCreator.id,
        expect.stringContaining("Test Task"),
      );
    });

    it("🟢 should notify a user once when they are both assignee and creator", async () => {
      mockTaskFindById.mockResolvedValue({
        ...mockTask,
        assignedTo: mockCreator.id,
      });
      mockProjectFindById.mockResolvedValue(mockProject);

      await CommentService.addTaskComment(
        { taskId: mockTask.id, content: "Hello" },
        { user: mockOtherMember },
      );

      expect(mockNotify).toHaveBeenCalledTimes(1);
      expect(mockNotify).toHaveBeenCalledWith(mockCreator.id, expect.any(String));
    });

    it("🟢 should still return the comment if a notification fails", async () => {
      setupTaskChain();
      mockNotify.mockRejectedValue(new Error("Redis down"));

      const result = await CommentService.addTaskComment(
        { taskId: mockTask.id, content: "Hello" },
        { user: mockOtherMember },
      );

      expect(result.id).toBe(mockComment.id);
    });

    it("🔴 USER not assigned to the project should not comment", async () => {
      setupTaskChain();

      await expect(
        CommentService.addTaskComment(
          { taskId: mockTask.id, content: "Hello" },
          { user: mockOutsider },
        ),
      ).rejects.toThrow("You are not a member of this project");
      expect(mockCommentCreate).not.toHaveBeenCalled();
      expect(mockNotify).not.toHaveBeenCalled();
    });

    it("🔴 should reject an empty comment", async () => {
      await expect(
        CommentService.addTaskComment(
          { taskId: mockTask.id, content: "   " },
          { user: mockMember },
        ),
      ).rejects.toThrow("Comment cannot be empty");
      expect(mockCommentCreate).not.toHaveBeenCalled();
    });

    it("🔴 should reject a comment over 2000 characters", async () => {
      await expect(
        CommentService.addTaskComment(
          { taskId: mockTask.id, content: "a".repeat(2001) },
          { user: mockMember },
        ),
      ).rejects.toThrow("Comment must be at most 2000 characters");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // ADD SUBTASK COMMENT
  // ════════════════════════════════════════════════════════════════
  describe("addSubTaskComment", () => {
    it("🟢 project member should add a comment to a subtask", async () => {
      setupSubTaskChain();

      await CommentService.addSubTaskComment(
        { subTaskId: mockSubTask.id, content: "Done?" },
        { user: mockCreator },
      );

      expect(mockCommentCreate).toHaveBeenCalledWith({
        content: "Done?",
        userId: mockCreator.id,
        taskId: mockSubTask.task,
        subTaskId: mockSubTask.id,
      });
    });

    it("🟢 should notify the subtask's assignee and creator", async () => {
      setupSubTaskChain();

      await CommentService.addSubTaskComment(
        { subTaskId: mockSubTask.id, content: "Done?" },
        { user: mockCreator },
      );

      expect(mockNotify).toHaveBeenCalledTimes(2);
      expect(mockNotify).toHaveBeenCalledWith(
        mockOtherMember.id,
        expect.stringContaining("Test SubTask"),
      );
      expect(mockNotify).toHaveBeenCalledWith(
        mockMember.id,
        expect.stringContaining("Test SubTask"),
      );
    });

    it("🔴 USER not assigned to the project should not comment", async () => {
      setupSubTaskChain();

      await expect(
        CommentService.addSubTaskComment(
          { subTaskId: mockSubTask.id, content: "Hi" },
          { user: mockOutsider },
        ),
      ).rejects.toThrow("You are not a member of this project");
      expect(mockCommentCreate).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // UPDATE COMMENT
  // ════════════════════════════════════════════════════════════════
  describe("updateComment", () => {
    it("🟢 author should edit their own comment", async () => {
      mockCommentFindById.mockResolvedValue(mockComment);
      setupTaskChain();
      mockCommentUpdate.mockResolvedValue({ ...mockComment, content: "Edited" });

      const result = await CommentService.updateComment(
        { id: mockComment.id, content: "Edited" },
        { user: mockMember },
      );

      expect(mockCommentUpdate).toHaveBeenCalledWith(mockComment.id, {
        content: "Edited",
      });
      expect(result.content).toBe("Edited");
    });

    it("🔴 SUPER_ADMIN should not edit someone else's comment", async () => {
      mockCommentFindById.mockResolvedValue(mockComment);
      setupTaskChain();

      await expect(
        CommentService.updateComment(
          { id: mockComment.id, content: "Edited" },
          { user: mockSuperAdmin },
        ),
      ).rejects.toThrow("You can only edit your own comments");
      expect(mockCommentUpdate).not.toHaveBeenCalled();
    });

    it("🔴 author removed from the project should not edit", async () => {
      mockCommentFindById.mockResolvedValue(mockComment);
      mockTaskFindById.mockResolvedValue(mockTask);
      mockProjectFindById.mockResolvedValue({
        ...mockProject,
        assignedUsers: [mockOtherMember.id],
      });

      await expect(
        CommentService.updateComment(
          { id: mockComment.id, content: "Edited" },
          { user: mockMember },
        ),
      ).rejects.toThrow("You are not a member of this project");
    });

    it("🔴 should throw if comment not found", async () => {
      mockCommentFindById.mockResolvedValue(null);

      await expect(
        CommentService.updateComment(
          { id: mockComment.id, content: "Edited" },
          { user: mockMember },
        ),
      ).rejects.toThrow("Comment not found");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // DELETE COMMENT
  // ════════════════════════════════════════════════════════════════
  describe("deleteComment", () => {
    beforeEach(() => {
      mockCommentFindById.mockResolvedValue(mockComment);
      mockCommentDelete.mockResolvedValue(mockComment);
      setupTaskChain();
    });

    it("🟢 author should delete their own comment", async () => {
      await CommentService.deleteComment(mockComment.id, { user: mockMember });

      expect(mockCommentDelete).toHaveBeenCalledWith(mockComment.id);
    });

    it("🟢 SUPER_ADMIN should delete any comment", async () => {
      await CommentService.deleteComment(mockComment.id, {
        user: mockSuperAdmin,
      });

      expect(mockCommentDelete).toHaveBeenCalledWith(mockComment.id);
    });

    it("🟢 CLIENT_ADMIN of the project's client should delete any comment", async () => {
      mockClientFindByAssignedAdmin.mockResolvedValue(mockClient);

      await CommentService.deleteComment(mockComment.id, {
        user: mockClientAdmin,
      });

      expect(mockCommentDelete).toHaveBeenCalledWith(mockComment.id);
    });

    it("🔴 CLIENT_ADMIN of a different client should not delete", async () => {
      mockClientFindByAssignedAdmin.mockResolvedValue(mockOtherClient);

      await expect(
        CommentService.deleteComment(mockComment.id, {
          user: mockOtherClientAdmin,
        }),
      ).rejects.toThrow("You do not have permission to delete this comment");
      expect(mockCommentDelete).not.toHaveBeenCalled();
    });

    it("🔴 another project member should not delete someone else's comment", async () => {
      await expect(
        CommentService.deleteComment(mockComment.id, {
          user: mockOtherMember,
        }),
      ).rejects.toThrow("You do not have permission to delete this comment");
      expect(mockCommentDelete).not.toHaveBeenCalled();
    });

    it("🔴 should throw if comment not found", async () => {
      mockCommentFindById.mockResolvedValue(null);

      await expect(
        CommentService.deleteComment(mockComment.id, { user: mockMember }),
      ).rejects.toThrow("Comment not found");
    });
  });
});
