// Seeds a throwaway database for the frontend Playwright suite (frontend/e2e).
// Wipes the database and the Redis cache first, so every run starts from the same state.
//   MONGO_URI=mongodb://127.0.0.1:27018/projoman-e2e REDIS_PORT=6380 node scripts/seed-e2e.js
// Refuses to run against anything but a local database. Prints the seeded records as JSON.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Redis from "ioredis";
import { User, Client, Project, Task } from "../models/import.js";

/** Password shared by every seeded user. */
const E2E_PASSWORD = "Password123!";

/** Users created by the seed, one per role. */
const USERS = {
  superAdmin: { name: "Sam Super", email: "super@e2e.test", role: "SUPER_ADMIN" },
  clientAdmin: { name: "Cara Client", email: "clientadmin@e2e.test", role: "CLIENT_ADMIN" },
  user: { name: "Uma User", email: "user@e2e.test", role: "USER" },
};

async function main() {
  const uri = process.env.MONGO_URI ?? "";
  // A typo here would wipe a real database, so only local hosts are allowed
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(uri)) {
    throw new Error(`Refusing to seed non-local MONGO_URI: ${uri || "(unset)"}`);
  }

  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();

  const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    lazyConnect: true,
  });
  await redis.connect();
  await redis.flushdb(); // Drop cached entities from earlier runs
  redis.disconnect();

  const password = await bcrypt.hash(E2E_PASSWORD, 10);
  const users = {};
  for (const [key, u] of Object.entries(USERS)) {
    const doc = await User.create({ ...u, password, number: "0400000000", gender: "OTHERS", dob: "1990-01-01" });
    users[key] = { id: doc.id, ...u };
  }

  const client = await Client.create({
    name: "Acme Corp",
    email: "acme@e2e.test",
    assignedAdmin: users.clientAdmin.id,
  });
  const project = await Project.create({
    name: "Website Revamp",
    description: "Seeded project for e2e tests",
    clientId: client.id,
    assignedUsers: [users.user.id],
  });
  const task = await Task.create({
    title: "Seeded task",
    priority: "NORMAL",
    currentStatus: "NEW",
    assignedTo: users.user.id,
    createdBy: users.clientAdmin.id,
    project: project.id,
  });

  await mongoose.disconnect();

  console.log(
    JSON.stringify({
      password: E2E_PASSWORD,
      users,
      client: { id: client.id, name: client.name },
      project: { id: project.id, name: project.name },
      task: { id: task.id, title: task.title },
    }),
  );
}

main().catch(async (err) => {
  console.error("E2E seed failed:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});
