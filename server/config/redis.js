import Redis from "ioredis";
import logger from "./logger.js";

const isDev = process.env.NODE_ENV === "development";

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const redis = new Redis({
  ...redisConfig,
  retryStrategy(times) {
    if (times > 3) {
      logger.warn("Redis connection failed, caching disabled");
      return null;
    }
    return Math.min(times * 200, 2000);
  },
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.warn({ err }, "Redis error"));

export { redis, redisConfig };
