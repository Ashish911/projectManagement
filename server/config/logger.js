// App-wide Pino logger, plus MongoDB index setup.
import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

// Logger that does nothing. Used when no request logger is available (e.g. in tests).
const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => noopLogger,
};

// Pretty, colored, debug-level logs in development; structured JSON at info level otherwise.
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

/**
 * Creates the MongoDB indexes the app relies on. Safe to run on every startup.
 * Errors are logged, not thrown, so a failure here does not stop the app.
 * @param {import("mongodb").Db} db Native database handle from connectDB().
 */
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

    // Projects — fields used in filters
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

/**
 * Returns the per-request logger from the GraphQL context, or a no-op logger if there is none.
 * @param {object} [context] GraphQL context.
 * @returns {object} A logger with info, warn, error, debug and child methods.
 */
export const createLogger = (context) => context?.logger ?? noopLogger;

export default logger;
