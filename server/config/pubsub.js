import { RedisPubSub } from "graphql-redis-subscriptions";
import { redisConfig } from "./redis.js";
import logger from "./logger.js";

export const NOTIFICATION_CREATED = "NOTIFICATION_CREATED";

// RedisPubSub requires config under the 'connection' key — it does new IORedis(connection) internally
const pubsub = new RedisPubSub({ connection: redisConfig });

pubsub.getSubscriber().on("connect", () =>
  logger.info("RedisPubSub subscriber connected")
);
pubsub.getPublisher().on("connect", () =>
  logger.info("RedisPubSub publisher connected")
);
pubsub.getSubscriber().on("error", (err) =>
  logger.error({ err }, "RedisPubSub subscriber error")
);
pubsub.getPublisher().on("error", (err) =>
  logger.error({ err }, "RedisPubSub publisher error")
);

export default pubsub;
