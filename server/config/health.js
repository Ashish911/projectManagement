// Readiness checks used by the /health/ready endpoint.
import mongoose from "mongoose";
import { redis } from "./redis.js";

const PROBE_TIMEOUT_MS = 2000; // Fail a probe that hangs, so health checks answer quickly

/**
 * Runs a dependency check with a timeout.
 * @param {() => Promise<unknown>} check Function that resolves if the dependency is reachable.
 * @returns {Promise<"up" | "down">}
 */
const probe = async (check) => {
  let timer;
  try {
    // Whichever settles first wins: the check, or the timeout rejecting.
    await Promise.race([
      check(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("timeout")),
          PROBE_TIMEOUT_MS,
        );
      }),
    ]);
    return "up";
  } catch {
    // Also covers a check that throws synchronously, e.g. MongoDB not connected yet.
    return "down";
  } finally {
    clearTimeout(timer); // Don't leave the timer pending after a fast check
  }
};

/**
 * Checks whether this instance can serve traffic.
 * Only MongoDB is required; without Redis the app still works, just without caching.
 * @returns {Promise<{ ready: boolean, checks: { mongo: string, redis: string } }>}
 */
export const checkReadiness = async () => {
  // Run both probes in parallel, so the endpoint answers within one timeout.
  const [mongo, redisStatus] = await Promise.all([
    probe(() => mongoose.connection.db.admin().ping()),
    probe(() => redis.ping()),
  ]);

  return { ready: mongo === "up", checks: { mongo, redis: redisStatus } };
};
