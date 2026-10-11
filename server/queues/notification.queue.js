// BullMQ queue that carries notifications from the API to the notification worker.
import { Queue } from "bullmq";
import { redisConfig } from "../config/redis.js";
import logger from "../config/logger.js";

/** Queue name shared with worker/notification.worker.js. */
export const NOTIFICATION_QUEUE = "notifications";

let queue = null;

/**
 * Returns the notification queue, creating it on first use so that importing
 * this module (e.g. in tests) does not open a Redis connection.
 * @returns {Queue}
 */
export function getNotificationQueue() {
  if (queue) return queue;
  queue = new Queue(NOTIFICATION_QUEUE, {
    // Fail fast while Redis is down, so the caller can fall back to saving directly
    connection: { ...redisConfig, enableOfflineQueue: false },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 }, // 1s, 2s, 4s
      removeOnComplete: 1000, // Keep the last 1000 finished jobs for inspection
      removeOnFail: 5000,
    },
  });
  queue.on("error", (err) => logger.warn({ err }, "Notification queue error"));
  return queue;
}
