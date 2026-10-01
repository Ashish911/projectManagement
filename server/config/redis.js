// Shared Redis client and connection settings.
import Redis from "ioredis";
import logger from "./logger.js";

const isDev = process.env.NODE_ENV === "development";

/**
 * Redis connection settings, read from environment variables with local defaults.
 * Also used by the pub/sub, notification queue and worker, which need their own connections.
 */
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379, // Default Redis port
  password: process.env.REDIS_PASSWORD || undefined,
};

/** Redis client used for caching. */
const redis = new Redis({
  ...redisConfig,
  // Retry up to 3 times, waiting longer each time (200ms, 400ms, 600ms; max 2s).
  // After that, stop retrying so the app keeps running without a cache.
  retryStrategy(times) {
    if (times > 3) {
      logger.warn("Redis connection failed, caching disabled");
      return null; // Returning null tells ioredis to stop reconnecting
    }
    return Math.min(times * 200, 2000);
  },
});

// Log connection events. Errors are warnings because the app can run without Redis.
redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.warn({ err }, "Redis error"));

export { redis, redisConfig };
