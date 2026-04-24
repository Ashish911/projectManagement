// tests/user.service.test.js
import { jest } from "@jest/globals";

// ─── Mock Data defined at top level ──────────────────────────────
const plainPassword = "password123";

let hashedPassword;
let mockUser;
let mockSuperAdmin;
let mockClientAdmin;
let registerData;

// ─── Mock functions ───────────────────────────────────────────────
const mockFindByEmail = jest.fn();
const mockFindById = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockPreferenceCreate = jest.fn();

// ─── Mock the modules using unstable_mockModule ───────────────────
jest.unstable_mockModule("../repositories/user.repo.js", () => ({
  UserRepo: {
    findByEmail: mockFindByEmail,
    findById: mockFindById,
    create: mockCreate,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

jest.unstable_mockModule("../repositories/preference.repo.js", () => ({
  PreferenceRepo: {
    create: mockPreferenceCreate,
  },
}));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { UserService } = await import("../services/user.service.js");
const bcrypt = await import("bcryptjs");

// ─── Setup test data ──────────────────────────────────────────────
beforeAll(async () => {
  process.env.SECRET_KEY = "test_secret_key";

  hashedPassword = await bcrypt.default.hash(plainPassword, 10);

  mockUser = {
    id: "648a1b2c3d4e5f6a7b8c9d0e",
    name: "Test User",
    email: "test@example.com",
    password: hashedPassword,
    role: "USER",
    loginAttempts: 0,
    lastFailedLogin: null,
  };

  mockSuperAdmin = {
    id: "648a1b2c3d4e5f6a7b8c9d0f",
    name: "Super Admin",
    email: "admin@example.com",
    password: hashedPassword,
    role: "SUPER_ADMIN",
    loginAttempts: 0,
    lastFailedLogin: null,
  };

  mockClientAdmin = {
    id: "648a1b2c3d4e5f6a7b8c9d1a",
    name: "Client Admin",
    email: "clientadmin@example.com",
    password: hashedPassword,
    role: "CLIENT_ADMIN",
    loginAttempts: 0,
    lastFailedLogin: null,
  };

  registerData = {
    name: "New User",
    email: "new@example.com",
    password: plainPassword,
    number: "1234567890",
    dob: "1990-01-01",
    role: "USER",
    gender: "MALE",
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────
describe("UserService", () => {
  // ════════════════════════════════════════════════════════════════
  // LOGIN
  // ════════════════════════════════════════════════════════════════
  describe("login", () => {
    it("🟢 should login successfully and return token", async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockUpdate.mockResolvedValue(mockUser);

      const result = await UserService.login("test@example.com", plainPassword);

      expect(result.token).toBeDefined();
      expect(result.email).toBe("test@example.com");
      expect(result.id).toBe(mockUser.id);
      expect(result.tokenExpiration).toBe(1);
    });

    it("🟢 should reset loginAttempts on successful login", async () => {
      mockFindByEmail.mockResolvedValue({
        ...mockUser,
        loginAttempts: 3,
        lastFailedLogin: new Date().toISOString(),
      });
      mockUpdate.mockResolvedValue(mockUser);

      await UserService.login("test@example.com", plainPassword);

      expect(mockUpdate).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          loginAttempts: 0,
          lastFailedLogin: null,
        }),
      );
    });

    it("🟢 should sign token with correct payload", async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockUpdate.mockResolvedValue(mockUser);

      const result = await UserService.login("test@example.com", plainPassword);

      const decoded = JSON.parse(
        Buffer.from(result.token.split(".")[1], "base64").toString(),
      );
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    it("🟢 should allow login after lockout window has passed", async () => {
      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString();
      mockFindByEmail.mockResolvedValue({
        ...mockUser,
        loginAttempts: 5,
        lastFailedLogin: twoHoursAgo,
      });
      mockUpdate.mockResolvedValue(mockUser);

      const result = await UserService.login("test@example.com", plainPassword);

      expect(result.token).toBeDefined();
    });

    it("🟢 should work for SUPER_ADMIN login", async () => {
      mockFindByEmail.mockResolvedValue(mockSuperAdmin);
      mockUpdate.mockResolvedValue(mockSuperAdmin);

      const result = await UserService.login(
        "admin@example.com",
        plainPassword,
      );

      expect(result.token).toBeDefined();
      expect(result.email).toBe("admin@example.com");
    });

    it("🟢 should work for CLIENT_ADMIN login", async () => {
      mockFindByEmail.mockResolvedValue(mockClientAdmin);
      mockUpdate.mockResolvedValue(mockClientAdmin);

      const result = await UserService.login(
        "clientadmin@example.com",
        plainPassword,
      );

      expect(result.token).toBeDefined();
    });

    it("🔴 should throw if user not found", async () => {
      mockFindByEmail.mockResolvedValue(null);

      await expect(
        UserService.login("notfound@example.com", plainPassword),
      ).rejects.toThrow("User not found");
    });

    it("🔴 should throw if password is invalid", async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockUpdate.mockResolvedValue(mockUser);

      await expect(
        UserService.login("test@example.com", "wrongpassword"),
      ).rejects.toThrow("Invalid password");
    });

    it("🔴 should increment loginAttempts on failed login", async () => {
      mockFindByEmail.mockResolvedValue({
        ...mockUser,
        loginAttempts: 2,
      });
      mockUpdate.mockResolvedValue(mockUser);

      try {
        await UserService.login("test@example.com", "wrongpassword");
      } catch (e) {}

      expect(mockUpdate).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ loginAttempts: 3 }),
      );
    });

    it("🔴 should throw if account is locked", async () => {
      mockFindByEmail.mockResolvedValue({
        ...mockUser,
        loginAttempts: 5,
        lastFailedLogin: new Date().toISOString(),
      });

      await expect(
        UserService.login("test@example.com", plainPassword),
      ).rejects.toThrow("Too many failed login attempts. Try again later.");
    });

    it("🔴 should throw if email is empty", async () => {
      mockFindByEmail.mockResolvedValue(null);

      await expect(UserService.login("", plainPassword)).rejects.toThrow(
        "Invalid email format",
      );
    });

    it("🔴 should throw if email is wrong", async () => {
      mockFindByEmail.mockResolvedValue(null);

      await expect(
        UserService.login("asd@gmail.com", plainPassword),
      ).rejects.toThrow("User not found");
    });

    it("🔴 should throw if password is empty", async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockUpdate.mockResolvedValue(mockUser);

      await expect(UserService.login("test@example.com", "")).rejects.toThrow(
        "Password must be at least 8 characters",
      );
    });

    it("🔴 should throw if password is wrong", async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockUpdate.mockResolvedValue(mockUser);

      await expect(
        UserService.login("test@example.com", "wrongpassword"),
      ).rejects.toThrow("Invalid password");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // REGISTER
  // ════════════════════════════════════════════════════════════════
  describe("register", () => {
    it("🟢 should register a new user successfully", async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        ...registerData,
        id: "648a1b2c3d4e5f6a7b8c9d1b",
      });
      mockPreferenceCreate.mockResolvedValue({});

      const result = await UserService.register(registerData);

      expect(result.email).toBe("new@example.com");
      expect(result.id).toBeDefined();
    });

    it("🟢 should hash password before saving", async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        ...registerData,
        id: "648a1b2c3d4e5f6a7b8c9d1b",
      });
      mockPreferenceCreate.mockResolvedValue({});

      await UserService.register(registerData);

      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.password).not.toBe(plainPassword);
      const isHashed = await bcrypt.default.compare(
        plainPassword,
        createCall.password,
      );
      expect(isHashed).toBe(true);
    });

    it("🟢 should create default LIGHT preference on register", async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        ...registerData,
        id: "648a1b2c3d4e5f6a7b8c9d1b",
      });
      mockPreferenceCreate.mockResolvedValue({});

      await UserService.register(registerData);

      expect(mockPreferenceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: "LIGHT",
          language: "ENGLISH",
        }),
      );
    });

    it("🟢 should set loginAttempts to 0 on register", async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        ...registerData,
        id: "648a1b2c3d4e5f6a7b8c9d1b",
      });
      mockPreferenceCreate.mockResolvedValue({});

      await UserService.register(registerData);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          loginAttempts: 0,
          lastFailedLogin: null,
        }),
      );
    });

    it("🔴 should throw if email already exists", async () => {
      mockFindByEmail.mockResolvedValue(mockUser);

      await expect(UserService.register(registerData)).rejects.toThrow(
        "Email already exists please use a different email",
      );
    });

    it("🔴 should not call create if email already exists", async () => {
      mockFindByEmail.mockResolvedValue(mockUser);

      try {
        await UserService.register(registerData);
      } catch (e) {}

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("🔴 should not create preference if user creation fails", async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreate.mockRejectedValue(new Error("DB error"));

      try {
        await UserService.register(registerData);
      } catch (e) {}

      expect(mockPreferenceCreate).not.toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════
  // GET PROFILE
  // ════════════════════════════════════════════════════════════════
  describe("getProfile", () => {
    it("🟢 should return user profile", async () => {
      mockFindById.mockResolvedValue(mockUser);

      const result = await UserService.getProfile(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(mockFindById).toHaveBeenCalledWith(mockUser.id);
    });

    it("🟢 should return SUPER_ADMIN profile", async () => {
      mockFindById.mockResolvedValue(mockSuperAdmin);

      const result = await UserService.getProfile(mockSuperAdmin.id);

      expect(result.role).toBe("SUPER_ADMIN");
    });

    it("🟢 should return CLIENT_ADMIN profile", async () => {
      mockFindById.mockResolvedValue(mockClientAdmin);

      const result = await UserService.getProfile(mockClientAdmin.id);

      expect(result.role).toBe("CLIENT_ADMIN");
    });

    it("🔴 should throw if user not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(UserService.getProfile(mockUser.id)).rejects.toThrow(
        "User not found",
      );
    });
  });

  // ════════════════════════════════════════════════════════════════
  // PROMOTE TO ADMIN
  // ════════════════════════════════════════════════════════════════
  describe("promoteToAdmin", () => {
    const mockPromotedUser = { ...mockUser, role: "CLIENT_ADMIN" };

    it("🟢 SUPER_ADMIN should promote a USER to CLIENT_ADMIN", async () => {
      mockFindById.mockResolvedValue(mockUser);
      mockUpdate.mockResolvedValue(mockPromotedUser);

      const result = await UserService.promoteToAdmin(mockUser.id, {
        user: mockSuperAdmin,
      });

      expect(result.role).toBe("CLIENT_ADMIN");
      expect(mockUpdate).toHaveBeenCalledWith(mockUser.id, {
        role: "CLIENT_ADMIN",
      });
    });

    it("🟢 should not call update if user is not found", async () => {
      mockFindById.mockResolvedValue(null);

      try {
        await UserService.promoteToAdmin(mockUser.id, {
          user: mockSuperAdmin,
        });
      } catch (e) {}

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("🔴 CLIENT_ADMIN should not promote a user", async () => {
      await expect(
        UserService.promoteToAdmin(mockUser.id, { user: mockClientAdmin }),
      ).rejects.toThrow(
        "Current role does not have the permission to promote users to admin",
      );
    });

    it("🔴 USER should not promote a user", async () => {
      await expect(
        UserService.promoteToAdmin(mockUser.id, { user: mockUser }),
      ).rejects.toThrow(
        "Current role does not have the permission to promote users to admin",
      );
    });

    it("🔴 should throw if target user is not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        UserService.promoteToAdmin(mockUser.id, { user: mockSuperAdmin }),
      ).rejects.toThrow("User not found");
    });

    it("🔴 should throw if target user is already CLIENT_ADMIN", async () => {
      mockFindById.mockResolvedValue(mockClientAdmin);

      await expect(
        UserService.promoteToAdmin(mockClientAdmin.id, { user: mockSuperAdmin }),
      ).rejects.toThrow("User is already a admin.");
    });

    it("🔴 should throw if target user is already SUPER_ADMIN", async () => {
      mockFindById.mockResolvedValue(mockSuperAdmin);

      await expect(
        UserService.promoteToAdmin(mockSuperAdmin.id, { user: mockSuperAdmin }),
      ).rejects.toThrow("User is already a admin.");
    });

    it("🔴 should throw if userId is invalid", async () => {
      await expect(
        UserService.promoteToAdmin("invalid-id", { user: mockSuperAdmin }),
      ).rejects.toThrow("Invalid ID format");
    });
  });
});
