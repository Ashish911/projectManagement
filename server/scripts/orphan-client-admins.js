// One-off data fix: finds CLIENT_ADMIN users that no client points to (a client admin must have a client).
//   npm run db:orphan-admins             (dev,  .env.local) — list only
//   npm run db:orphan-admins -- --demote  demote them to USER (audit-logged)
//   npm run db:orphan-admins:prod         same against .env.prod
import { pathToFileURL } from "url";

/**
 * Client admins without a client.
 * @param {{ _id: any }[]} admins  Users with role CLIENT_ADMIN.
 * @param {{ assignedAdmin?: any }[]} clients All clients.
 * @returns {object[]} The admins no client is assigned to.
 */
export function orphanAdmins(admins, clients) {
  const assigned = new Set(clients.map((c) => String(c.assignedAdmin ?? "")).filter(Boolean));
  return admins.filter((u) => !assigned.has(String(u._id)));
}

/**
 * Lists (and, with `demote`, demotes) orphaned client admins.
 * @param {{ User: import("mongoose").Model, Client: import("mongoose").Model }} models
 * @param {{ demote?: boolean }} [options]
 * @returns {Promise<{ orphans: object[], demoted: number }>}
 */
export async function run({ User, Client }, { demote = false } = {}) {
  const admins = await User.find({ role: "CLIENT_ADMIN" }, "name email role").lean();
  const clients = await Client.find({}, "assignedAdmin").lean();
  const orphans = orphanAdmins(admins, clients);
  if (!demote || !orphans.length) return { orphans, demoted: 0 };
  // The role filter makes a re-run, or a concurrent assignment, harmless
  const { modifiedCount } = await User.updateMany({ _id: { $in: orphans.map((u) => u._id) }, role: "CLIENT_ADMIN" }, { role: "USER" });
  return { orphans, demoted: modifiedCount };
}

/** CLI entry: connects with MONGO_URI, prints the orphans, demotes them with --demote. */
async function main() {
  const demote = process.argv.includes("--demote");
  const { default: mongoose } = await import("mongoose");
  const { default: logger } = await import("../config/logger.js");
  const { User, Client } = await import("../models/import.js");
  try {
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
    const { orphans, demoted } = await run({ User, Client }, { demote });
    console.log(`${orphans.length} client admin(s) without a client:`);
    for (const u of orphans) console.log(`  ${u._id}  ${u.email}  ${u.name}`);
    if (demote) {
      for (const u of orphans) {
        logger.info({ audit: true, targetUserId: String(u._id), action: "ORPHAN_CLIENT_ADMIN_DEMOTED", oldRole: "CLIENT_ADMIN", newRole: "USER" }, "AUDIT");
      }
      console.log(`Demoted ${demoted} to USER.`);
    } else if (orphans.length) {
      console.log("Run again with --demote to make them users, or assign each one a client.");
    }
  } catch (err) {
    console.error("Orphan check failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
