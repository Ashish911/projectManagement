// tests/indexes.test.js — every index the app relies on is declared in a schema (no database needed)
import { jest } from "@jest/globals";

// connectDB uses the shared mongoose instance, so stubbing connect on it is enough
const { default: mongoose } = await import("mongoose");
const mockConnect = jest.fn();
mongoose.connect = mockConnect;

const models = await import("../models/import.js");
const { User, Client, Project, Task, SubTask, Notification } = models;

/** The schema's declared indexes as [fields, options] pairs. */
const indexesOf = (Model) => Model.schema.indexes();

/** The declared index whose key equals `fields` exactly (order matters), or undefined. */
const findIndex = (Model, fields) =>
  indexesOf(Model).find(
    ([key]) => JSON.stringify(key) === JSON.stringify(fields),
  );

describe("Schema indexes", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("query paths are indexed", () => {
    it.each([
      ["Task.project (findByProject / findByProjects)", Task, { project: 1 }],
      ["Task.assignedTo (unassignUser)", Task, { assignedTo: 1 }],
      ["SubTask.task + currentStatus (findByTask, subTaskStats counts)", SubTask, { task: 1, currentStatus: 1 }],
      ["SubTask.assignedTo (unassignUser)", SubTask, { assignedTo: 1 }],
      ["Notification.user + createdAt desc (findByUser, markRead, deleteByUser)", Notification, { user: 1, createdAt: -1 }],
      ["Project.clientId (findByClient)", Project, { clientId: 1 }],
      ["Project.assignedUsers (findByAssignedUser)", Project, { assignedUsers: 1 }],
      ["Client.assignedAdmin (findByAssignedAdmin, clearAdmin)", Client, { assignedAdmin: 1 }],
      ["User.role (users by role)", User, { role: 1 }],
    ])("🟢 %s", (_, Model, fields) => {
      expect(findIndex(Model, fields)).toBeDefined();
    });
  });

  it("🟢 User.email is unique", () => {
    expect(findIndex(User, { email: 1 })?.[1]).toMatchObject({ unique: true });
  });

  it("🟢 User.resetToken is indexed only while a reset is pending (it defaults to null)", () => {
    expect(findIndex(User, { resetToken: 1 })?.[1]).toMatchObject({
      partialFilterExpression: { resetToken: { $gt: "" } },
    });
  });

  // The filters use $gt: "" rather than $type: "string": MongoDB only picks a partial index when the
  // query implies its filter, and an equality match on a string implies $gt: "" but not $type.
  it("🔴 Client.email is unique only where an email exists (clients without email must not collide)", () => {
    const options = findIndex(Client, { email: 1 })?.[1];
    expect(options).toMatchObject({
      unique: true,
      partialFilterExpression: { email: { $gt: "" } },
    });
  });

  it("🔴 each key pattern is declared once per model (no duplicate indexes)", () => {
    for (const Model of Object.values(models)) {
      const keys = indexesOf(Model).map(([key]) => JSON.stringify(key));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe("Index lifecycle", () => {
  it("🔴 the logger no longer builds indexes", async () => {
    const loggerModule = await import("../config/logger.js");
    expect(loggerModule.createIndexes).toBeUndefined();
  });

  it("🟢 connectDB builds indexes automatically outside production", async () => {
    const { default: connectDB } = await import("../config/db.js");
    mockConnect.mockResolvedValue({ connection: { host: "h", db: {} } });
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      await connectDB();
    } finally {
      process.env.NODE_ENV = env;
    }
    expect(mockConnect).toHaveBeenCalledWith(process.env.MONGO_URI, expect.objectContaining({ autoIndex: true }));
  });

  it("🔴 connectDB does not build indexes in production (the deploy script does)", async () => {
    const { default: connectDB } = await import("../config/db.js");
    mockConnect.mockResolvedValue({ connection: { host: "h", db: {} } });
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      await connectDB();
    } finally {
      process.env.NODE_ENV = env;
    }
    expect(mockConnect).toHaveBeenCalledWith(process.env.MONGO_URI, expect.objectContaining({ autoIndex: false }));
  });
});

describe("sync-indexes script", () => {
  // A model whose collection holds `existing` indexes and whose schema declares `declared`
  const fakeModel = (name, { existing = [], declared = [] } = {}) => {
    const collection = {
      indexes: jest.fn().mockResolvedValue([{ name: "_id_", key: { _id: 1 } }, ...existing]),
      dropIndex: jest.fn().mockResolvedValue(undefined),
    };
    return {
      modelName: name,
      collection,
      schema: { indexes: () => declared },
      syncIndexes: jest.fn().mockResolvedValue(["old_idx"]),
      diffIndexes: jest.fn().mockResolvedValue({ toDrop: ["old_idx"], toCreate: [{ a: 1 }] }),
    };
  };

  it("🟢 finds legacy-named copies of declared indexes (same key, different name)", async () => {
    const { legacyNamed } = await import("../scripts/sync-indexes.js");
    const existing = [
      { name: "role_idx", key: { role: 1 } }, // declared as role_1 → legacy copy
      { name: "email_1", key: { email: 1 } }, // already has the schema name
      { name: "custom", key: { other: 1 } }, // not declared; syncIndexes handles it
    ];
    const declared = [[{ role: 1 }, {}], [{ email: 1 }, { unique: true }], [{ a: 1, b: -1 }, { name: "ab_idx" }]];
    expect(legacyNamed(existing, declared)).toEqual(["role_idx"]);
  });

  it("🟢 drops legacy-named copies before syncing, so the sync can rebuild them", async () => {
    const { run } = await import("../scripts/sync-indexes.js");
    const m = fakeModel("Client", {
      existing: [{ name: "assignedAdmin_idx", key: { assignedAdmin: 1 } }],
      declared: [[{ assignedAdmin: 1 }, {}]],
    });
    const report = await run([m], { dryRun: false });
    expect(m.collection.dropIndex).toHaveBeenCalledWith("assignedAdmin_idx");
    expect(m.collection.dropIndex.mock.invocationCallOrder[0]).toBeLessThan(m.syncIndexes.mock.invocationCallOrder[0]);
    expect(report[0].dropped).toEqual(["assignedAdmin_idx", "old_idx"]);
  });

  it("🔴 a failing model is reported and the others still sync", async () => {
    const { run } = await import("../scripts/sync-indexes.js");
    const bad = fakeModel("Bad");
    bad.syncIndexes.mockRejectedValue(new Error("Index build failed"));
    const good = fakeModel("Good");
    const report = await run([bad, good], { dryRun: false });
    expect(report[0]).toEqual({ model: "Bad", error: "Index build failed" });
    expect(good.syncIndexes).toHaveBeenCalled();
  });

  it("🟢 syncs every model and reports what was dropped", async () => {
    const { run } = await import("../scripts/sync-indexes.js");
    const ms = [fakeModel("A"), fakeModel("B")];
    const report = await run(ms, { dryRun: false });
    ms.forEach((m) => {
      expect(m.syncIndexes).toHaveBeenCalledTimes(1);
      expect(m.diffIndexes).not.toHaveBeenCalled();
    });
    expect(report).toEqual([
      { model: "A", dropped: ["old_idx"] },
      { model: "B", dropped: ["old_idx"] },
    ]);
  });

  it("🔴 --dry-run only diffs and changes nothing", async () => {
    const { run } = await import("../scripts/sync-indexes.js");
    const ms = [fakeModel("A")];
    const report = await run(ms, { dryRun: true });
    expect(ms[0].syncIndexes).not.toHaveBeenCalled();
    expect(report).toEqual([{ model: "A", toDrop: ["old_idx"], toCreate: [{ a: 1 }], renamed: [] }]);
    expect(ms[0].collection.dropIndex).not.toHaveBeenCalled();
  });
});
