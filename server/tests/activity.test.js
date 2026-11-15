import { jest } from "@jest/globals";

// ─── Mock functions ───────────────────────────────────────────────
const mockCreate = jest.fn();
const mockFindRecent = jest.fn();
const mockFindByProjects = jest.fn();
const mockFindByAssignedAdmin = jest.fn();
const mockProjectsByClient = jest.fn();
const mockProjectsByUser = jest.fn();
const mockLogError = jest.fn();

// ─── Mock the modules ─────────────────────────────────────────────
jest.unstable_mockModule("../repositories/activity.repo.js", () => ({
  ActivityRepo: { create: mockCreate, findRecent: mockFindRecent, findByProjects: mockFindByProjects },
}));
jest.unstable_mockModule("../repositories/client.repo.js", () => ({
  ClientRepo: { findByAssignedAdmin: mockFindByAssignedAdmin },
}));
jest.unstable_mockModule("../repositories/project.repo.js", () => ({
  ProjectRepo: { findByClientId: mockProjectsByClient, findByAssignedUser: mockProjectsByUser },
}));
jest.unstable_mockModule("../config/logger.js", () => ({
  default: { error: mockLogError, info: jest.fn(), warn: jest.fn(), child: () => ({ error: mockLogError, info: jest.fn(), warn: jest.fn() }) },
  createLogger: () => ({ error: mockLogError, info: jest.fn(), warn: jest.fn() }),
}));

// ─── Import AFTER mocking ─────────────────────────────────────────
const { ActivityService } = await import("../services/activity.service.js");

const superAdmin = { id: "648a1b2c3d4e5f6a7b8c9d0f", role: "SUPER_ADMIN" };
const clientAdmin = { id: "648a1b2c3d4e5f6a7b8c9d1a", role: "CLIENT_ADMIN" };
const member = { id: "648a1b2c3d4e5f6a7b8c9d0e", role: "USER" };

beforeEach(() => jest.clearAllMocks());

describe("ActivityService.record", () => {
  it("🟢 saves the entry", async () => {
    mockCreate.mockResolvedValue({ id: "a1" });
    await ActivityService.record({ actor: superAdmin.id, action: "ROLE_CHANGED", summary: "x" });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ action: "ROLE_CHANGED" }));
  });

  it("🔴 a failed write is logged, never thrown", async () => {
    mockCreate.mockRejectedValue(new Error("db down"));
    await expect(ActivityService.record({ actor: superAdmin.id, action: "ROLE_CHANGED", summary: "x" })).resolves.toBeNull();
    expect(mockLogError).toHaveBeenCalled();
  });
});

describe("ActivityService.list", () => {
  it("🟢 a SUPER_ADMIN sees everything", async () => {
    mockFindRecent.mockResolvedValue([{ id: "a1" }]);
    await expect(ActivityService.list({ limit: 10 }, { user: superAdmin })).resolves.toEqual([{ id: "a1" }]);
    expect(mockFindRecent).toHaveBeenCalledWith(10);
  });

  it("🟢 a CLIENT_ADMIN sees activity on their client's projects and the projects they are on", async () => {
    mockFindByAssignedAdmin.mockResolvedValue({ id: "c1" });
    mockProjectsByClient.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    mockProjectsByUser.mockResolvedValue([{ id: "p2" }, { id: "p3" }]);
    mockFindByProjects.mockResolvedValue([]);
    await ActivityService.list({}, { user: clientAdmin });
    expect(mockFindByProjects).toHaveBeenCalledWith(["p1", "p2", "p3"], 20);
    expect(mockFindRecent).not.toHaveBeenCalled();
  });

  it("🟢 a USER sees activity on their projects only", async () => {
    mockProjectsByUser.mockResolvedValue([{ id: "p9" }]);
    mockFindByProjects.mockResolvedValue([]);
    await ActivityService.list({ limit: 5 }, { user: member });
    expect(mockFindByProjects).toHaveBeenCalledWith(["p9"], 5);
  });

  it("🟢 a CLIENT_ADMIN without a client sees activity on the projects they are on", async () => {
    mockFindByAssignedAdmin.mockResolvedValue(null);
    mockProjectsByUser.mockResolvedValue([{ id: "p3" }]);
    mockFindByProjects.mockResolvedValue([]);
    await ActivityService.list({}, { user: clientAdmin });
    expect(mockFindByProjects).toHaveBeenCalledWith(["p3"], 20);
  });

  it("🔴 a CLIENT_ADMIN with no client and no projects sees nothing", async () => {
    mockFindByAssignedAdmin.mockResolvedValue(null);
    mockProjectsByUser.mockResolvedValue([]);
    await expect(ActivityService.list({}, { user: clientAdmin })).resolves.toEqual([]);
    expect(mockFindByProjects).not.toHaveBeenCalled();
  });

  it("🔴 the limit is capped", async () => {
    mockFindRecent.mockResolvedValue([]);
    await ActivityService.list({ limit: 5000 }, { user: superAdmin });
    expect(mockFindRecent).toHaveBeenCalledWith(100);
  });
});
