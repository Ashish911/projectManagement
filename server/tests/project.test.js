// tests/project.service.test.js
import { jest } from "@jest/globals";

// ─── Mock functions ───────────────────────────────────────────────
const mockProjectFind = jest.fn();
const mockProjectFindById = jest.fn();
const mockProjectFindByClient = jest.fn();
const mockProjectFindByAssignedUser = jest.fn();
const mockProjectCreate = jest.fn();
const mockProjectUpdate = jest.fn();
const mockProjectDelete = jest.fn();

const mockClientFindById = jest.fn();
const mockClientFindByUser = jest.fn();

// ─── Mock the modules ─────────────────────────────────────────────
jest.unstable_mockModule("../repositories/import.repo.js", () => ({
  ProjectRepo: {
    find: mockProjectFind,
    findById: mockProjectFindById,
    findByClient: mockProjectFindByClient,
    findByAssignedUser: mockProjectFindByAssignedUser,
    create: mockProjectCreate,
    update: mockProjectUpdate,
    delete: mockProjectDelete,
  },
  ClientRepo: {
    findById: mockClientFindById,
    findByUser: mockClientFindByUser,
  },
}));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { ProjectService } = await import("../services/project.service.js");

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

const mockClient = {
  _id: "748a1b2c3d4e5f6a7b8c9d0e",
  name: "Test Client",
  assignedAdmin: "648a1b2c3d4e5f6a7b8c9d1a",
};

const mockProject = {
  _id: "848a1b2c3d4e5f6a7b8c9d0e",
  name: "Test Project",
  description: "Test Description",
  status: "NOT_STARTED",
  clientId: "748a1b2c3d4e5f6a7b8c9d0e",
  assignedUser: ["648a1b2c3d4e5f6a7b8c9d0e"],
};

const addProjectData = {
  name: "New Project",
  description: "New Description",
  status: "NOT_STARTED",
  clientId: "748a1b2c3d4e5f6a7b8c9d0e",
};

// ─── Tests ────────────────────────────────────────────────────────
describe("ProjectService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════
  // GET PROJECTS
  // ════════════════════════════════════════════════════════════════
  describe("getProjects", () => {
    it("🟢 SUPER_ADMIN should get all projects", async () => {
      mockProjectFind.mockResolvedValue([mockProject]);

      const result = await ProjectService.getProjects({
        user: mockSuperAdmin,
      });

      expect(result).toEqual([mockProject]);
      expect(mockProjectFind).toHaveBeenCalled();
    });

    it("🟢 CLIENT_ADMIN should get only their client projects", async () => {
      mockClientFindByUser.mockResolvedValue(mockClient);
      mockProjectFindByClient.mockResolvedValue([mockProject]);

      const result = await ProjectService.getProjects({
        user: mockClientAdmin,
      });

      expect(result).toEqual([mockProject]);
      expect(mockProjectFindByClient).toHaveBeenCalledWith(mockClient._id);
    });

    it("🟢 USER should get only their assigned projects", async () => {
      mockProjectFindByAssignedUser.mockResolvedValue([mockProject]);

      const result = await ProjectService.getProjects({
        user: mockUser,
      });

      expect(result).toEqual([mockProject]);
      expect(mockProjectFindByAssignedUser).toHaveBeenCalledWith(mockUser.id);
    });

    it("🔴 CLIENT_ADMIN should throw if no client assigned", async () => {
      mockClientFindByUser.mockResolvedValue(null);

      await expect(
        ProjectService.getProjects({ user: mockClientAdmin }),
      ).rejects.toThrow("No client assigned to this admin");
    });

    it("🟢 should return empty array if no projects found", async () => {
      mockProjectFind.mockResolvedValue([]);

      const result = await ProjectService.getProjects({
        user: mockSuperAdmin,
      });

      expect(result).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // GET PROJECT
  // ════════════════════════════════════════════════════════════════
  describe("getProject", () => {
    it("🟢 SUPER_ADMIN should get any project", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);

      const result = await ProjectService.getProject(mockProject._id, {
        user: mockSuperAdmin,
      });

      expect(result).toEqual(mockProject);
    });

    it("🟢 CLIENT_ADMIN should get project from their client", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockClientFindByUser.mockResolvedValue({
        ...mockClient,
        _id: mockProject.clientId,
      });

      const result = await ProjectService.getProject(mockProject._id, {
        user: mockClientAdmin,
      });

      expect(result).toBeDefined();
    });

    it("🔴 CLIENT_ADMIN should not get project from another client", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockClientFindByUser.mockResolvedValue({
        ...mockClient,
        _id: "differentclient1234567",
      });

      await expect(
        ProjectService.getProject(mockProject._id, { user: mockClientAdmin }),
      ).rejects.toThrow("You do not have access to this project");
    });

    it("🟢 USER should get project they are assigned to", async () => {
      mockProjectFindById.mockResolvedValue({
        ...mockProject,
        assignedUser: [mockUser.id],
      });

      const result = await ProjectService.getProject(mockProject._id, {
        user: mockUser,
      });

      expect(result).toBeDefined();
    });

    it("🔴 USER should not get project they are not assigned to", async () => {
      mockProjectFindById.mockResolvedValue({
        ...mockProject,
        assignedUser: ["differentuser1234567"],
      });

      await expect(
        ProjectService.getProject(mockProject._id, { user: mockUser }),
      ).rejects.toThrow("You are not assigned to this project");
    });

    it("🔴 should throw if project id is wrong", async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(
        ProjectService.getProject("nonexistent", { user: mockSuperAdmin }),
      ).rejects.toThrow("Invalid ID format");
    });

    it("🔴 should throw if project not found when incorrect id is sent", async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(
        ProjectService.getProject("648a1b2c3d4e5f6a7b8c9d00", {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("Project not found");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // ADD PROJECT
  // ════════════════════════════════════════════════════════════════
  describe("addProject", () => {
    it("🟢 SUPER_ADMIN should add a project successfully", async () => {
      mockClientFindById.mockResolvedValue(mockClient);
      mockProjectCreate.mockResolvedValue({
        ...addProjectData,
        _id: "848a1b2c3d4e5f6a7b8c9d0f",
      });

      const result = await ProjectService.addProject(addProjectData, {
        user: mockSuperAdmin,
      });

      expect(result._id).toBeDefined();
      expect(mockProjectCreate).toHaveBeenCalled();
    });

    it("🟢 CLIENT_ADMIN should add project for their client", async () => {
      mockClientFindById.mockResolvedValue({
        ...mockClient,
        assignedAdmin: mockClientAdmin.id,
      });
      mockProjectCreate.mockResolvedValue({
        ...addProjectData,
        _id: "848a1b2c3d4e5f6a7b8c9d0f",
      });

      const result = await ProjectService.addProject(addProjectData, {
        user: mockClientAdmin,
      });

      expect(result).toBeDefined();
      expect(mockProjectCreate).toHaveBeenCalled();
    });

    it("🔴 USER should not add a project", async () => {
      await expect(
        ProjectService.addProject(addProjectData, { user: mockUser }),
      ).rejects.toThrow(
        "Current role does not have the permission to add Projects",
      );
    });

    it("🔴 should throw if client not found", async () => {
      mockClientFindById.mockResolvedValue(null);

      await expect(
        ProjectService.addProject(addProjectData, { user: mockSuperAdmin }),
      ).rejects.toThrow("Client not found");
    });

    it("🔴 CLIENT_ADMIN should not add project for another client", async () => {
      mockClientFindById.mockResolvedValue({
        ...mockClient,
        assignedAdmin: "differentadmin1234567",
      });

      await expect(
        ProjectService.addProject(addProjectData, { user: mockClientAdmin }),
      ).rejects.toThrow("You are not the admin of this client");
    });

    it("🔴 should not call create if client not found", async () => {
      mockClientFindById.mockResolvedValue(null);

      try {
        await ProjectService.addProject(addProjectData, {
          user: mockSuperAdmin,
        });
      } catch (e) {}

      expect(mockProjectCreate).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // UPDATE PROJECT
  // ════════════════════════════════════════════════════════════════
  describe("updateProject", () => {
    const updateData = {
      id: "848a1b2c3d4e5f6a7b8c9d0e",
      name: "Updated Project",
      description: "Updated Description",
      status: "IN_PROGRESS",
    };

    it("🟢 SUPER_ADMIN should update any project", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockProjectUpdate.mockResolvedValue({ ...mockProject, ...updateData });

      const result = await ProjectService.updateProject(updateData, {
        user: mockSuperAdmin,
      });

      expect(result.name).toBe("Updated Project");
      expect(mockProjectUpdate).toHaveBeenCalled();
    });

    it("🟢 CLIENT_ADMIN should update project for their client", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockClientFindById.mockResolvedValue({
        ...mockClient,
        assignedAdmin: mockClientAdmin.id,
      });
      mockProjectUpdate.mockResolvedValue({ ...mockProject, ...updateData });

      const result = await ProjectService.updateProject(updateData, {
        user: mockClientAdmin,
      });

      expect(result).toBeDefined();
    });

    it("🔴 USER should not update a project", async () => {
      await expect(
        ProjectService.updateProject(updateData, { user: mockUser }),
      ).rejects.toThrow(
        "Current role does not have the permission to update Projects",
      );
    });

    it("🔴 should throw if project not found", async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(
        ProjectService.updateProject(updateData, { user: mockSuperAdmin }),
      ).rejects.toThrow("Project not found");
    });

    it("🔴 CLIENT_ADMIN should not update project of another client", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockClientFindById.mockResolvedValue({
        ...mockClient,
        assignedAdmin: "differentadmin1234567",
      });

      await expect(
        ProjectService.updateProject(updateData, { user: mockClientAdmin }),
      ).rejects.toThrow("You are not the admin of this client");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // DELETE PROJECT
  // ════════════════════════════════════════════════════════════════
  describe("deleteProject", () => {
    it("🟢 SUPER_ADMIN should delete any project", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockProjectDelete.mockResolvedValue(mockProject);

      const result = await ProjectService.deleteProject(mockProject._id, {
        user: mockSuperAdmin,
      });

      expect(mockProjectDelete).toHaveBeenCalledWith(mockProject._id);
      expect(result).toEqual(mockProject);
    });

    it("🟢 CLIENT_ADMIN should delete project for their client", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockClientFindById.mockResolvedValue({
        ...mockClient,
        assignedAdmin: mockClientAdmin.id,
      });
      mockProjectDelete.mockResolvedValue(mockProject);

      const result = await ProjectService.deleteProject(mockProject._id, {
        user: mockClientAdmin,
      });

      expect(mockProjectDelete).toHaveBeenCalled();
    });

    it("🔴 USER should not delete a project", async () => {
      await expect(
        ProjectService.deleteProject(mockProject._id, { user: mockUser }),
      ).rejects.toThrow(
        "Current role does not have the permission to delete Projects",
      );
    });

    it("🔴 should throw if project id is wrong", async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(
        ProjectService.deleteProject("nonexistent", { user: mockSuperAdmin }),
      ).rejects.toThrow("Invalid ID format");
    });

    it("🔴 should throw if project not found", async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(
        ProjectService.deleteProject("648a1b2c3d4e5f6a7b8c9d0f", {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("Project not found");
    });

    it("🔴 CLIENT_ADMIN should not delete project of another client", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockClientFindById.mockResolvedValue({
        ...mockClient,
        assignedAdmin: "differentadmin1234567",
      });

      await expect(
        ProjectService.deleteProject(mockProject._id, {
          user: mockClientAdmin,
        }),
      ).rejects.toThrow("You are not the admin of this client");
    });

    it("🔴 should not call delete if project not found", async () => {
      mockProjectFindById.mockResolvedValue(null);

      try {
        await ProjectService.deleteProject("nonexistent", {
          user: mockSuperAdmin,
        });
      } catch (e) {}

      expect(mockProjectDelete).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // ADD USER TO PROJECT
  // ════════════════════════════════════════════════════════════════
  describe("addUserToProject", () => {
    const addUserData = {
      id: "848a1b2c3d4e5f6a7b8c9d0e",
      users: ["748a1b2c3d4e5f6a7b8c9d1f"],
    };

    it("🟢 SUPER_ADMIN should add users to any project", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockProjectUpdate.mockResolvedValue({
        ...mockProject,
        assignedUser: [...mockProject.assignedUser, ...addUserData.users],
      });

      const result = await ProjectService.addUserToProject(addUserData, {
        user: mockSuperAdmin,
      });

      expect(mockProjectUpdate).toHaveBeenCalled();
    });

    it("🟢 CLIENT_ADMIN should add users to their project", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockClientFindById.mockResolvedValue({
        ...mockClient,
        assignedAdmin: mockClientAdmin.id,
      });
      mockProjectUpdate.mockResolvedValue({
        ...mockProject,
        assignedUser: [...mockProject.assignedUser, ...addUserData.users],
      });

      const result = await ProjectService.addUserToProject(addUserData, {
        user: mockClientAdmin,
      });

      expect(mockProjectUpdate).toHaveBeenCalled();
    });

    it("🔴 USER should not add users to a project", async () => {
      await expect(
        ProjectService.addUserToProject(addUserData, { user: mockUser }),
      ).rejects.toThrow(
        "Current role does not have the permission to add users to Projects",
      );
    });

    it("🔴 should throw if project not found", async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(
        ProjectService.addUserToProject(addUserData, { user: mockSuperAdmin }),
      ).rejects.toThrow("Project not found");
    });

    it("🟢 should not add duplicate users", async () => {
      mockProjectFindById.mockResolvedValue({
        ...mockProject,
        assignedUser: [addUserData.users[0]], // user already in project
      });
      mockProjectUpdate.mockResolvedValue(mockProject);

      await ProjectService.addUserToProject(addUserData, {
        user: mockSuperAdmin,
      });

      const updateCall = mockProjectUpdate.mock.calls[0][1];
      const uniqueUsers = new Set(updateCall.assignedUser);
      expect(uniqueUsers.size).toBe(updateCall.assignedUser.length);
    });
  });

  // ════════════════════════════════════════════════════════════════
  // REMOVE USER FROM PROJECT
  // ════════════════════════════════════════════════════════════════
  describe("removeUserFromProject", () => {
    const removeUserData = {
      id: "848a1b2c3d4e5f6a7b8c9d0e",
      users: ["648a1b2c3d4e5f6a7b8c9d0e"],
    };

    it("🟢 SUPER_ADMIN should remove users from any project", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockProjectUpdate.mockResolvedValue({
        ...mockProject,
        assignedUser: [],
      });

      const result = await ProjectService.removeUserFromProject(
        removeUserData,
        { user: mockSuperAdmin },
      );

      expect(mockProjectUpdate).toHaveBeenCalled();
    });

    it("🟢 CLIENT_ADMIN should remove users from their project", async () => {
      mockProjectFindById.mockResolvedValue(mockProject);
      mockClientFindById.mockResolvedValue({
        ...mockClient,
        assignedAdmin: mockClientAdmin.id,
      });
      mockProjectUpdate.mockResolvedValue({
        ...mockProject,
        assignedUser: [],
      });

      await ProjectService.removeUserFromProject(removeUserData, {
        user: mockClientAdmin,
      });

      expect(mockProjectUpdate).toHaveBeenCalled();
    });

    it("🔴 USER should not remove users from a project", async () => {
      await expect(
        ProjectService.removeUserFromProject(removeUserData, {
          user: mockUser,
        }),
      ).rejects.toThrow(
        "Current role does not have the permission to remove users from Projects",
      );
    });

    it("🔴 should throw if project not found", async () => {
      mockProjectFindById.mockResolvedValue(null);

      await expect(
        ProjectService.removeUserFromProject(removeUserData, {
          user: mockSuperAdmin,
        }),
      ).rejects.toThrow("Project not found");
    });

    it("🟢 should only remove specified users", async () => {
      const extraUser = "748a1b2c3d4e5f6a7b8c9d1f";
      mockProjectFindById.mockResolvedValue({
        ...mockProject,
        assignedUser: [mockUser.id, extraUser],
      });
      mockProjectUpdate.mockResolvedValue({
        ...mockProject,
        assignedUser: [extraUser],
      });

      await ProjectService.removeUserFromProject(removeUserData, {
        user: mockSuperAdmin,
      });

      const updateCall = mockProjectUpdate.mock.calls[0][1];
      expect(updateCall.assignedUser).not.toContain(mockUser.id);
      expect(updateCall.assignedUser).toContain(extraUser);
    });
  });
});
