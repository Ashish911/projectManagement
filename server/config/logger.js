// App-wide Pino logger.
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
  // Mask secrets if they are ever passed to a log call.
  redact: {
    paths: [
      "req.headers.authorization",
      "password",
      "*.password",
      "token",
      "*.token",
      "resetToken",
      "*.resetToken",
    ],
    censor: "[REDACTED]",
  },
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
 * Returns the per-request logger from the GraphQL context, or a no-op logger if there is none.
 * @param {object} [context] GraphQL context.
 * @returns {object} A logger with info, warn, error, debug and child methods.
 */
export const createLogger = (context) => context?.logger ?? noopLogger;

export default logger;
