// tests/graphqlTypes.test.js — GraphQL output types match what the models can actually hold
import { GraphQLNonNull } from "graphql";

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
