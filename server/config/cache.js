// Redis-backed cache used by services. Failures are logged, never thrown,
// so the app keeps working (falling back to the database) if Redis is down.
import { redis } from "./redis.js";
import logger from "./logger.js";

const DEFAULT_TTL = 60 * 5; // 5 minutes, in seconds

/**
 * Simple JSON cache on top of Redis.
 * Keys follow the pattern `entity:id` or `entity:all`.
 */
export const cache = {
  /**
   * Reads a cached value.
   * @param {string} key Cache key.
   * @returns {Promise<any|null>} The parsed value, or null on a miss or Redis error.
   */
  async get(key) {
    try {
      const data = await redis.get(key);
      if (data) {
        logger.debug({ key }, "Cache HIT");
        return JSON.parse(data);
      }
      logger.debug({ key }, "Cache MISS");
      return null;
    } catch (err) {
      logger.warn({ err, key }, "Cache get failed, falling through to DB");
      return null; // never crash if Redis is down
    }
  },

  /**
   * Stores a value as JSON with an expiry.
   * @param {string} key   Cache key.
   * @param {any} value    Value to cache; must be JSON-serializable.
   * @param {number} [ttl] Time to live in seconds (default 5 minutes).
   */
  async set(key, value, ttl = DEFAULT_TTL) {
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttl);
    } catch (err) {
      logger.warn({ err, key }, "Cache set failed");
    }
  },

  /**
   * Removes a single key. Call after any write that changes the cached data.
   * @param {string} key Cache key.
   */
  async invalidate(key) {
    try {
      await redis.del(key);
      logger.debug({ key }, "Cache invalidated");
    } catch (err) {
      logger.warn({ err, key }, "Cache invalidation failed");
    }
  },

  /**
   * Removes all keys matching a pattern.
   * @param {string} pattern Redis glob pattern, e.g. "clients:*".
   */
  async invalidatePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(...keys); // `del` with no keys would error, so skip it
      logger.debug(
        { pattern, count: keys.length },
        "Cache pattern invalidated",
      );
    } catch (err) {
      logger.warn({ err, pattern }, "Cache pattern invalidation failed");
    }
  },
};
