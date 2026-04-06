import redis from "./redis.js";
import logger from "./logger.js";

const DEFAULT_TTL = 60 * 5;

export const cache = {
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

  async set(key, value, ttl = DEFAULT_TTL) {
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttl);
    } catch (err) {
      logger.warn({ err, key }, "Cache set failed");
    }
  },

  async invalidate(key) {
    try {
      await redis.del(key);
      logger.debug({ key }, "Cache invalidated");
    } catch (err) {
      logger.warn({ err, key }, "Cache invalidation failed");
    }
  },

  // Invalidate all keys matching a pattern e.g. "clients:*"
  async invalidatePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length) await redis.del(...keys);
      logger.debug(
        { pattern, count: keys.length },
        "Cache pattern invalidated",
      );
    } catch (err) {
      logger.warn({ err, pattern }, "Cache pattern invalidation failed");
    }
  },
};
