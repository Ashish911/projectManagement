import { jest } from "@jest/globals";
import bcrypt from "bcryptjs";

// ─── Mock functions ───────────────────────────────────────────────
const mockUserFind = jest.fn();
const mockUserFindByIds = jest.fn();
const mockUserFindByEmail = jest.fn();
const mockUserFindById = jest.fn();
const mockUserCreate = jest.fn();
const mockUserUpdate = jest.fn();
const mockUserDelete = jest.fn();
const mockPreferenceCreate = jest.fn();
const mockClientFindById = jest.fn();
const mockClientFindByAssignedAdmin = jest.fn();
const mockClientUpdate = jest.fn();
const mockSendInvite = jest.fn();
const mockNotify = jest.fn();

// ─── Mock the modules ─────────────────────────────────────────────
jest.unstable_mockModule("../repositories/user.repo.js", () => ({
  UserRepo: {
    find: mockUserFind,
    findByIds: mockUserFindByIds,
    findByEmail: mockUserFindByEmail,
    findById: mockUserFindById,
    create: mockUserCreate,
    update: mockUserUpdate,
    delete: mockUserDelete,
  },
}));

jest.unstable_mockModule("../repositories/preference.repo.js", () => ({
  PreferenceRepo: { create: mockPreferenceCreate },
}));

jest.unstable_mockModule("../repositories/client.repo.js", () => ({
  ClientRepo: {
    findById: mockClientFindById,
    findByAssignedAdmin: mockClientFindByAssignedAdmin,
    update: mockClientUpdate,
    clearAdmin: jest.fn().mockResolvedValue({}),
  },
}));

const mockRemoveUserEverywhere = jest.fn().mockResolvedValue({});
jest.unstable_mockModule("../repositories/project.repo.js", () => ({
  ProjectRepo: { removeUserEverywhere: mockRemoveUserEverywhere },
}));

jest.unstable_mockModule("../services/email.service.js", () => ({
  EmailService: { sendPasswordReset: jest.fn(), sendInvite: mockSendInvite },
}));

jest.unstable_mockModule("../services/notification.service.js", () => ({
  NotificationService: { notify: mockNotify },
}));

jest.unstable_mockModule("../repositories/task.repo.js", () => ({
  TaskRepo: { unassignUser: jest.fn().mockResolvedValue({}) },
}));

jest.unstable_mockModule("../repositories/subTask.repo.js", () => ({
  SubTaskRepo: { unassignUser: jest.fn().mockResolvedValue({}) },
}));

jest.unstable_mockModule("../config/cache.js", () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    invalidate: jest.fn().mockResolvedValue(undefined),
  },
}));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { UserService } = await import("../services/user.service.js");

// ─── Mock Data ────────────────────────────────────────────────────
const superAdmin = { id: "648a1b2c3d4e5f6a7b8c9d0f", role: "SUPER_ADMIN" };
const clientAdmin = { id: "648a1b2c3d4e5f6a7b8c9d1a", role: "CLIENT_ADMIN" };
const member = { id: "648a1b2c3d4e5f6a7b8c9d0e", role: "USER" };
const otherMember = { id: "648a1b2c3d4e5f6a7b8c9d2a", role: "USER" };
const client = { id: "748a1b2c3d4e5f6a7b8c9d0e", name: "Northwind", assignedAdmin: null };

const newUser = {
  name: "Mina Lama",
  email: "Mina@Projoman.dev",
  number: "+977 9800000000",
  gender: "FEMALE",
};

describe("UserService — administration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotify.mockResolvedValue({});
    mockSendInvite.mockResolvedValue(true);
    mockPreferenceCreate.mockResolvedValue({});
    mockUserCreate.mockImplementation(async (data) => ({ id: "948a1b2c3d4e5f6a7b8c9d0e", ...data }));
    mockUserUpdate.mockImplementation(async (id, data) => ({ id, ...data }));
  });

  // ════════════════════════════════════════════════════════════════
  // CREATE USER
  // ════════════════════════════════════════════════════════════════
  describe("createUser", () => {
    it("🟢 should invite a user by email with an unusable password", async () => {
      mockUserFindByEmail.mockResolvedValue(null);
      mockUserFindById.mockResolvedValue(null);

      await UserService.createUser(newUser, { user: superAdmin });

      const created = mockUserCreate.mock.calls[0][0];
      expect(created.email).toBe("mina@projoman.dev");
      expect(created.role).toBe("USER");
      expect(created.password).not.toBe("");
      // Invite token is stored hashed with an expiry, and the email goes out
      expect(mockUserUpdate).toHaveBeenCalledWith("948a1b2c3d4e5f6a7b8c9d0e", expect.objectContaining({
        resetToken: expect.any(String),
        resetTokenExpiry: expect.any(Date),
        invitedAt: expect.any(Date),
      }));
      expect(mockSendInvite).toHaveBeenCalledWith("mina@projoman.dev", "Mina Lama", expect.stringContaining("/reset-password?token="));
      expect(mockPreferenceCreate).toHaveBeenCalled();
    });

    it("🟢 should create a user with a temporary password", async () => {
      mockUserFindByEmail.mockResolvedValue(null);
      mockUserFindById.mockResolvedValue(null);

      await UserService.createUser({ ...newUser, mode: "PASSWORD", password: "TempPass#2026" }, { user: superAdmin });

      const created = mockUserCreate.mock.calls[0][0];
      expect(await bcrypt.compare("TempPass#2026", created.password)).toBe(true);
      expect(mockSendInvite).not.toHaveBeenCalled();
    });

    it("🟢 should attach a new client admin to their client", async () => {
      mockUserFindByEmail.mockResolvedValue(null);
      mockUserFindById.mockResolvedValue(null);
      mockClientFindById.mockResolvedValue(client);

      await UserService.createUser({ ...newUser, role: "CLIENT_ADMIN", clientId: client.id }, { user: superAdmin });

      expect(mockClientUpdate).toHaveBeenCalledWith(client.id, { assignedAdmin: "948a1b2c3d4e5f6a7b8c9d0e" });
    });

    it("🔴 should reject a client admin without a client", async () => {
      await expect(
        UserService.createUser({ ...newUser, role: "CLIENT_ADMIN" }, { user: superAdmin }),
      ).rejects.toThrow("Pick the client they'll manage");
      expect(mockUserCreate).not.toHaveBeenCalled();
    });

    it("🔴 should reject a client that already has an admin", async () => {
      mockUserFindByEmail.mockResolvedValue(null);
      mockClientFindById.mockResolvedValue({ ...client, assignedAdmin: clientAdmin.id });

      await expect(
        UserService.createUser({ ...newUser, role: "CLIENT_ADMIN", clientId: client.id }, { user: superAdmin }),
      ).rejects.toThrow("That client already has a client admin");
    });

    it("🔴 should reject a duplicate email", async () => {
      mockUserFindByEmail.mockResolvedValue({ id: "x" });
      await expect(UserService.createUser(newUser, { user: superAdmin })).rejects.toThrow("Someone already uses this email");
    });

    it("🔴 should reject a short temporary password", async () => {
      await expect(
        UserService.createUser({ ...newUser, mode: "PASSWORD", password: "short" }, { user: superAdmin }),
      ).rejects.toThrow("Password must be at least 8 characters");
    });

    it("🔴 CLIENT_ADMIN should not create users", async () => {
      await expect(UserService.createUser(newUser, { user: clientAdmin })).rejects.toThrow(
        "Current role does not have the permission to create users",
      );
    });

    it("🔴 should roll back the user if the preference fails", async () => {
      mockUserFindByEmail.mockResolvedValue(null);
      mockPreferenceCreate.mockRejectedValue(new Error("db down"));

      await expect(UserService.createUser(newUser, { user: superAdmin })).rejects.toThrow("db down");
      expect(mockUserDelete).toHaveBeenCalledWith("948a1b2c3d4e5f6a7b8c9d0e");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // UPDATE USER
  // ════════════════════════════════════════════════════════════════
  describe("updateUser", () => {
    it("🟢 SUPER_ADMIN should edit another user's profile", async () => {
      mockUserFindById.mockResolvedValue(member);
      mockUserFindByEmail.mockResolvedValue(null);

      await UserService.updateUser({ id: member.id, name: "Sita K", email: "SITA@x.io" }, { user: superAdmin });

      expect(mockUserUpdate).toHaveBeenCalledWith(member.id, { name: "Sita K", email: "sita@x.io" });
    });

    it("🔴 should reject an email that belongs to someone else", async () => {
      mockUserFindById.mockResolvedValue(member);
      mockUserFindByEmail.mockResolvedValue({ id: otherMember.id });

      await expect(
        UserService.updateUser({ id: member.id, email: "taken@x.io" }, { user: superAdmin }),
      ).rejects.toThrow("Someone already uses this email");
    });

    it("🔴 USER should not edit other users", async () => {
      await expect(UserService.updateUser({ id: otherMember.id, name: "X" }, { user: member })).rejects.toThrow(
        "Current role does not have the permission to edit users",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════
  // CHANGE ROLES
  // ════════════════════════════════════════════════════════════════
  describe("changeUserRoles", () => {
    it("🟢 should change several users to USER and notify them", async () => {
      mockUserFindByIds.mockResolvedValue([{ ...clientAdmin }, { ...otherMember }]);
      mockUserFind.mockResolvedValue([superAdmin, clientAdmin, otherMember]);
      mockClientFindByAssignedAdmin.mockResolvedValue({ id: client.id });

      await UserService.changeUserRoles({ ids: [clientAdmin.id, otherMember.id], role: "USER" }, { user: superAdmin });

      // The former client admin is detached from their client
      expect(mockClientUpdate).toHaveBeenCalledWith(client.id, { assignedAdmin: null });
      expect(mockUserUpdate).toHaveBeenCalledWith(clientAdmin.id, { role: "USER" });
      expect(mockNotify).toHaveBeenCalledTimes(1); // otherMember was already a USER
    });

    it("🟢 should make one user the admin of a client", async () => {
      mockUserFindByIds.mockResolvedValue([{ ...member }]);
      mockUserFind.mockResolvedValue([superAdmin, member]);
      mockClientFindById.mockResolvedValue(client);

      await UserService.changeUserRoles({ ids: [member.id], role: "CLIENT_ADMIN", clientId: client.id }, { user: superAdmin });

      expect(mockClientUpdate).toHaveBeenCalledWith(client.id, { assignedAdmin: member.id });
    });

    it("🔴 should keep at least one super admin", async () => {
      mockUserFindByIds.mockResolvedValue([{ ...superAdmin }]);
      mockUserFind.mockResolvedValue([superAdmin, member]);

      await expect(
        UserService.changeUserRoles({ ids: [superAdmin.id], role: "USER" }, { user: superAdmin }),
      ).rejects.toThrow("At least one super admin must remain");
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("🔴 should need exactly one person for a client admin", async () => {
      await expect(
        UserService.changeUserRoles({ ids: [member.id, otherMember.id], role: "CLIENT_ADMIN", clientId: client.id }, { user: superAdmin }),
      ).rejects.toThrow("A client admin needs exactly one person and a client");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // UNLOCK / RESEND INVITE / DELETE MANY
  // ════════════════════════════════════════════════════════════════
  describe("unlockUsers", () => {
    it("🟢 should clear failed sign-in attempts", async () => {
      mockUserFindByIds.mockResolvedValue([member]);
      await UserService.unlockUsers([member.id], { user: superAdmin });
      expect(mockUserUpdate).toHaveBeenCalledWith(member.id, { loginAttempts: 0, lastFailedLogin: null });
    });

    it("🔴 CLIENT_ADMIN should not unlock users", async () => {
      await expect(UserService.unlockUsers([member.id], { user: clientAdmin })).rejects.toThrow(
        "Current role does not have the permission to unlock users",
      );
    });
  });

  describe("resendInvite", () => {
    it("🟢 should send a new invite to someone who never signed in", async () => {
      mockUserFindById.mockResolvedValue({ ...member, email: "sita@x.io", name: "Sita", lastLoginAt: null });
      const result = await UserService.resendInvite(member.id, { user: superAdmin });
      expect(mockSendInvite).toHaveBeenCalled();
      expect(result.message).toContain("sita@x.io");
    });

    it("🔴 should refuse once the user has signed in", async () => {
      mockUserFindById.mockResolvedValue({ ...member, lastLoginAt: new Date() });
      await expect(UserService.resendInvite(member.id, { user: superAdmin })).rejects.toThrow("This user has already signed in");
    });
  });

  describe("deleteUsers", () => {
    it("🟢 should delete every selected user", async () => {
      mockUserFindByIds.mockResolvedValue([member, otherMember]);
      mockUserDelete.mockImplementation(async (id) => ({ id }));

      const result = await UserService.deleteUsers([member.id, otherMember.id], { user: superAdmin });

      expect(result).toHaveLength(2);
      // Each removed user is taken off every team
      expect(mockRemoveUserEverywhere).toHaveBeenCalledWith(member.id);
      expect(mockRemoveUserEverywhere).toHaveBeenCalledWith(otherMember.id);
    });

    it("🔴 should refuse to delete yourself", async () => {
      await expect(UserService.deleteUsers([superAdmin.id, member.id], { user: superAdmin })).rejects.toThrow(
        "You cannot delete your own account",
      );
      expect(mockUserDelete).not.toHaveBeenCalled();
    });

    it("🔴 should delete nothing if any user is missing", async () => {
      mockUserFindByIds.mockResolvedValue([member]);
      await expect(UserService.deleteUsers([member.id, otherMember.id], { user: superAdmin })).rejects.toThrow(
        "One or more users not found",
      );
      expect(mockUserDelete).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // CHANGE PASSWORD
  // ════════════════════════════════════════════════════════════════
  describe("changePassword", () => {
    it("🟢 should change the password when the current one is right", async () => {
      mockUserFindById.mockResolvedValue({ ...member, password: await bcrypt.hash("oldPassword1", 4) });

      await UserService.changePassword({ currentPassword: "oldPassword1", newPassword: "newPassword1" }, { user: member });

      const saved = mockUserUpdate.mock.calls[0][1].password;
      expect(await bcrypt.compare("newPassword1", saved)).toBe(true);
    });

    it("🔴 should reject a wrong current password", async () => {
      mockUserFindById.mockResolvedValue({ ...member, password: await bcrypt.hash("oldPassword1", 4) });

      await expect(
        UserService.changePassword({ currentPassword: "wrong-pass", newPassword: "newPassword1" }, { user: member }),
      ).rejects.toThrow("Current password is incorrect");
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("🔴 should reject a short new password", async () => {
      await expect(
        UserService.changePassword({ currentPassword: "oldPassword1", newPassword: "short" }, { user: member }),
      ).rejects.toThrow("Password must be at least 8 characters");
    });
  });
});
