import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => noopLogger,
};

const logger = pino({
  level: isDev ? "debug" : "info",
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  }),
});

export const createIndexes = async (db) => {
  try {
    // Users — frequent lookups
    await db
      .collection("users")
      .createIndex({ email: 1 }, { unique: true, name: "email_unique_idx" });
    await db.collection("users").createIndex({ role: 1 }, { name: "role_idx" });

    // Clients
    await db
      .collection("clients")
      .createIndex({ email: 1 }, { unique: true, name: "email_unique_idx" });
    await db
      .collection("clients")
      .createIndex({ assignedAdmin: 1 }, { name: "assignedAdmin_idx" });
    await db
      .collection("clients")
      .createIndex({ deleteRequest: 1 }, { name: "deleteRequest_idx" });

    // Projects (add whatever fields you filter by)
    await db
      .collection("projects")
      .createIndex({ clientId: 1 }, { name: "clientId_idx" });
    await db
      .collection("projects")
      .createIndex({ assignedUsers: 1 }, { name: "assignedUsers_idx" });

    logger.info("MongoDB indexes created");
  } catch (err) {
    logger.error({ err }, "Failed to create indexes");
  }
};

export const createLogger = (context) => context?.logger ?? noopLogger;

export default logger;
