import { Queue } from "bullmq";
import { redisConfig } from "../config/redis.js";

export const notificationQueue = new Queue("notifications", {
  connection: redisConfig,
});
