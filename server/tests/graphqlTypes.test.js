// tests/graphqlTypes.test.js — GraphQL output types match what the models can actually hold
import { GraphQLNonNull } from "graphql";
import { jest } from "@jest/globals";

const mockFindByAssignedAdmin = jest.fn();
jest.unstable_mockModule("../repositories/client.repo.js", () => ({
  ClientRepo: { findByAssignedAdmin: mockFindByAssignedAdmin },
}));

const { ClientType } = await import("../graphql/types/client.type.js");

describe("ClientType", () => {
  it.each(["email", "phone"])(
    "🔴 %s is nullable, because clients may be created without it",
    (field) => {
      const type = ClientType.getFields()[field].type;
      expect(type instanceof GraphQLNonNull).toBe(false);
    },
  );

  it("🟢 name stays required", () => {
    expect(ClientType.getFields().name.type instanceof GraphQLNonNull).toBe(true);
  });
});

const { TaskType } = await import("../graphql/types/task.type.js");

describe("TaskType", () => {
  it("🟢 exposes updatedAt as an ISO string (for 'recently updated' sorting)", () => {
    const field = TaskType.getFields().updatedAt;
    expect(field).toBeDefined();
    expect(field.resolve({ updatedAt: new Date("2026-11-01T10:00:00Z") })).toBe("2026-11-01T10:00:00.000Z");
  });
});

describe("ClientType timestamps", () => {
  it("🟢 exposes createdAt as an ISO string (oldest-first attention queue)", () => {
    const field = ClientType.getFields().createdAt;
    expect(field).toBeDefined();
    expect(field.resolve({ createdAt: new Date("2026-10-01T08:00:00Z") })).toBe("2026-10-01T08:00:00.000Z");
  });
});

const { ProjectType } = await import("../graphql/types/project.type.js");

describe("ProjectType.canManage", () => {
  const project = { clientId: "c1", assignedUsers: ["u2"] };
  const canManage = (user) => ProjectType.getFields().canManage.resolve(project, {}, { user });

  it("🟢 true for a super admin", async () => {
    await expect(canManage({ id: "u1", role: "SUPER_ADMIN" })).resolves.toBe(true);
  });

  it("🟢 true for the client admin of the project's client", async () => {
    mockFindByAssignedAdmin.mockResolvedValue({ id: "c1" });
    await expect(canManage({ id: "u2", role: "CLIENT_ADMIN" })).resolves.toBe(true);
  });

  it("🔴 false for a client admin who is only on the team", async () => {
    mockFindByAssignedAdmin.mockResolvedValue({ id: "c2" });
    await expect(canManage({ id: "u2", role: "CLIENT_ADMIN" })).resolves.toBe(false);
  });

  it("🔴 false for a user", async () => {
    await expect(canManage({ id: "u2", role: "USER" })).resolves.toBe(false);
  });
});
