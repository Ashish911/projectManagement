// Standalone process that delivers queued notifications (save to MongoDB + push over WebSocket).
import { Worker } from "bullmq";
import { redisConfig } from "../config/redis.js";
import { NotificationService } from "../services/notification.service.js";
import { NOTIFICATION_QUEUE } from "../queues/notification.queue.js";
import logger from "../config/logger.js";
import connectDB from "../config/db.js";
import { pathToFileURL } from "url";

/**
 * Handles one queued notification job.
 * @param {{ id: string, data: { user: string, content: string } }} job
 * @returns {Promise<object>} The saved notification.
 */
export async function processNotificationJob(job) {
  const { user, content } = job.data;
  logger.debug({ jobId: job.id, userId: user }, "Processing notification job");
  return await NotificationService.deliver(user, content);
}

/** Connects to MongoDB and starts consuming the queue; stops cleanly on SIGTERM/SIGINT. */
export async function startNotificationWorker() {
  await connectDB();

  const worker = new Worker(NOTIFICATION_QUEUE, processNotificationJob, {
    // BullMQ workers need blocking commands that never time out
    connection: { ...redisConfig, maxRetriesPerRequest: null },
    concurrency: 5, // Up to 5 jobs at once
  });

  worker.on("completed", (job) =>
    logger.info({ jobId: job.id }, "Notification job completed"),
  );
  worker.on("failed", (job, err) =>
    logger.error({ jobId: job?.id, attempts: job?.attemptsMade, err }, "Notification job failed"),
  );
  worker.on("error", (err) => logger.warn({ err }, "Notification worker error"));

  // Let the current jobs finish before exiting
  const shutdown = async (signal) => {
    logger.info({ signal }, "Notification worker shutting down");
    await worker.close();
    process.exit(0);
  };
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));

  logger.info("Notification worker running...");
  return worker;
}

// Start only when run directly (`node worker/notification.worker.js`), not when imported by tests
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startNotificationWorker();
}
