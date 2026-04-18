import { Worker } from "bullmq";
import { redisConfig } from "../config/redis.js";
import { NotificationService } from "../services/notification.service.js";
import logger from "../config/logger.js";
import connectDB from "../config/db.js";

await connectDB();

const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    console.log("Processing notification job:", job.data);
    const { user, content } = job.data;

    const notification = await NotificationService.notify(user, content);

    console.log("Notification created:", notification);
  },
  { connection: redisConfig },
);

notificationWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "✅ Notification job completed");
});

notificationWorker.on("failed", (job, err) => {
  logger.error({ jobId: job.id, err }, "❌ Notification job failed");
});

logger.info("Notification worker running...");

export default notificationWorker;
