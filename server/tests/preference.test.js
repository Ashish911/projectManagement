// tests/preference.service.test.js
import { jest } from "@jest/globals";

// ─── Mock functions ───────────────────────────────────────────────
const mockFindByUser = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

// ─── Mock the modules ─────────────────────────────────────────────
jest.unstable_mockModule("../repositories/preference.repo.js", () => ({
  PreferenceRepo: {
    findByUser: mockFindByUser,
    create: mockCreate,
    update: mockUpdate,
  },
}));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { PreferenceService } = await import("../services/preference.service.js");

// ─── Mock Data ────────────────────────────────────────────────────
const mockUser = {
  id: "648a1b2c3d4e5f6a7b8c9d0e",
  role: "USER",
};

const mockSuperAdmin = {
  id: "648a1b2c3d4e5f6a7b8c9d0f",
  role: "SUPER_ADMIN",
};

const mockClientAdmin = {
  id: "648a1b2c3d4e5f6a7b8c9d1a",
  role: "CLIENT_ADMIN",
};

const mockPreference = {
  theme: "LIGHT",
  language: "ENGLISH",
  user: "648a1b2c3d4e5f6a7b8c9d0e",
};

// ─── Tests ────────────────────────────────────────────────────────
describe("PreferenceService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════
  // GET PREFERENCE
  // ════════════════════════════════════════════════════════════════
  describe("getPreference", () => {
    it("🟢 should return preference for a USER", async () => {
      mockFindByUser.mockResolvedValue(mockPreference);

      const result = await PreferenceService.getPreference({
        user: mockUser,
      });

      expect(result).toEqual(mockPreference);
      expect(mockFindByUser).toHaveBeenCalledWith(mockUser.id);
    });

    it("🟢 should return preference for a SUPER_ADMIN", async () => {
      mockFindByUser.mockResolvedValue({
        ...mockPreference,
        user: mockSuperAdmin.id,
      });

      const result = await PreferenceService.getPreference({
        user: mockSuperAdmin,
      });

      expect(result).toBeDefined();
      expect(mockFindByUser).toHaveBeenCalledWith(mockSuperAdmin.id);
    });

    it("🟢 should return preference for a CLIENT_ADMIN", async () => {
      mockFindByUser.mockResolvedValue({
        ...mockPreference,
        user: mockClientAdmin.id,
      });

      const result = await PreferenceService.getPreference({
        user: mockClientAdmin,
      });

      expect(result).toBeDefined();
      expect(mockFindByUser).toHaveBeenCalledWith(mockClientAdmin.id);
    });

    it("🔴 should throw if preference not found", async () => {
      mockFindByUser.mockResolvedValue(null);

      await expect(
        PreferenceService.getPreference({ user: mockUser }),
      ).rejects.toThrow("Preference not found");
    });
  });

  // ════════════════════════════════════════════════════════════════
  // UPDATE PREFERENCE
  // ════════════════════════════════════════════════════════════════
  describe("updatePreference", () => {
    it("🟢 should update theme successfully", async () => {
      mockFindByUser.mockResolvedValue(mockPreference);
      mockUpdate.mockResolvedValue({
        ...mockPreference,
        theme: "DARK",
      });

      const result = await PreferenceService.updatePreference(
        { theme: "DARK" },
        { user: mockUser },
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        mockPreference._id,
        expect.objectContaining({ theme: "DARK" }),
      );
      expect(result.theme).toBe("DARK");
    });

    it("🟢 should update language successfully", async () => {
      mockFindByUser.mockResolvedValue(mockPreference);
      mockUpdate.mockResolvedValue({
        ...mockPreference,
        language: "JAPANESE",
      });

      const result = await PreferenceService.updatePreference(
        { language: "JAPANESE" },
        { user: mockUser },
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        mockPreference._id,
        expect.objectContaining({ language: "JAPANESE" }),
      );
      expect(result.language).toBe("JAPANESE");
    });

    it("🟢 should update both theme and language", async () => {
      mockFindByUser.mockResolvedValue(mockPreference);
      mockUpdate.mockResolvedValue({
        ...mockPreference,
        theme: "DARK",
        language: "KOREAN",
      });

      const result = await PreferenceService.updatePreference(
        { theme: "DARK", language: "KOREAN" },
        { user: mockUser },
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        mockPreference._id,
        expect.objectContaining({
          theme: "DARK",
          language: "KOREAN",
        }),
      );
      expect(result.theme).toBe("DARK");
      expect(result.language).toBe("KOREAN");
    });

    it("🟢 should not update fields that are not provided", async () => {
      mockFindByUser.mockResolvedValue(mockPreference);
      mockUpdate.mockResolvedValue({
        ...mockPreference,
        theme: "DARK",
      });

      await PreferenceService.updatePreference(
        { theme: "DARK" }, // only theme provided
        { user: mockUser },
      );

      // language should not be in the update call
      const updateCall = mockUpdate.mock.calls[0][1];
      expect(updateCall.language).toBeUndefined();
    });

    it("🟢 should work for SUPER_ADMIN", async () => {
      mockFindByUser.mockResolvedValue({
        ...mockPreference,
        user: mockSuperAdmin.id,
      });
      mockUpdate.mockResolvedValue({
        ...mockPreference,
        theme: "DARK",
        user: mockSuperAdmin.id,
      });

      const result = await PreferenceService.updatePreference(
        { theme: "DARK" },
        { user: mockSuperAdmin },
      );

      expect(result.theme).toBe("DARK");
    });

    it("🟢 should work for CLIENT_ADMIN", async () => {
      mockFindByUser.mockResolvedValue({
        ...mockPreference,
        user: mockClientAdmin.id,
      });
      mockUpdate.mockResolvedValue({
        ...mockPreference,
        language: "KOREAN",
        user: mockClientAdmin.id,
      });

      const result = await PreferenceService.updatePreference(
        { language: "KOREAN" },
        { user: mockClientAdmin },
      );

      expect(result.language).toBe("KOREAN");
    });

    it("🔴 should throw if preference not found", async () => {
      mockFindByUser.mockResolvedValue(null);

      await expect(
        PreferenceService.updatePreference(
          { theme: "DARK" },
          { user: mockUser },
        ),
      ).rejects.toThrow("Preference not found");
    });

    it("🔴 should not call update if preference not found", async () => {
      mockFindByUser.mockResolvedValue(null);

      try {
        await PreferenceService.updatePreference(
          { theme: "DARK" },
          { user: mockUser },
        );
      } catch (e) {}

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
