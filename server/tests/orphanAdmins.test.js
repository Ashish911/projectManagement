import { jest } from "@jest/globals";
import { orphanAdmins, run } from "../scripts/orphan-client-admins.js";

const admins = [
  { _id: "a1", name: "Has Client", email: "a1@x.io", role: "CLIENT_ADMIN" },
  { _id: "a2", name: "No Client", email: "a2@x.io", role: "CLIENT_ADMIN" },
];
const clients = [{ _id: "c1", assignedAdmin: "a1" }];

/** Minimal stand-ins for the User and Client models. */
const models = () => {
  const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
  return {
    User: { find: () => ({ lean: async () => admins }), updateMany },
    Client: { find: () => ({ lean: async () => clients }) },
    updateMany,
  };
};

describe("orphan client admins", () => {
  it("🟢 lists client admins that no client points to", () => {
    expect(orphanAdmins(admins, clients).map((u) => u._id)).toEqual(["a2"]);
  });

  it("🟢 only lists by default", async () => {
    const m = models();
    const report = await run(m);
    expect(report.orphans.map((u) => u.email)).toEqual(["a2@x.io"]);
    expect(report.demoted).toBe(0);
    expect(m.updateMany).not.toHaveBeenCalled();
  });

  it("🟢 --demote turns them into users", async () => {
    const m = models();
    const report = await run(m, { demote: true });
    expect(m.updateMany).toHaveBeenCalledWith({ _id: { $in: ["a2"] }, role: "CLIENT_ADMIN" }, { role: "USER" });
    expect(report.demoted).toBe(1);
  });

  it("🔴 nothing to do when every client admin has a client", async () => {
    expect(orphanAdmins([admins[0]], clients)).toEqual([]);
  });
});
