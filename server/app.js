/**
 * Application entry point.
 * Validates env vars, connects to MongoDB, starts the server, and handles shutdown.
 */

import "./config/env.js"; // Must be first: validates env vars and exits if any are invalid

// import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { startServer } from "./server.js";
import http from "http";
import { client } from "./config/metrics.js";
import { startWithCluster } from "./cluster.js";
import logger from "./config/logger.js";
import { getNotificationQueue } from "./queues/notification.queue.js";

// dotenv.config();

const isDev = process.env.NODE_ENV === "development";

const METRICS_PORT = process.env.METRICS_PORT || 9090; // Port scraped by Prometheus (see prometheus/prometheus.yml)

// Log and exit on errors nothing caught; in cluster mode the primary forks a replacement.
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled promise rejection");
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

/** Metrics server for this process; only set in the process that serves /metrics. */
let metricsServer = null;

// Cluster mode must create this in every process: workers use it to answer the
// primary's requests for their metrics, and the primary uses it to merge them.
const aggregator = isDev ? null : new client.AggregatorRegistry();

/**
 * Starts a separate HTTP server so Prometheus can scrape metrics without going through GraphQL.
 * @param {() => Promise<string>} getMetrics Returns metrics in Prometheus text format.
 * @returns {http.Server}
 */
const startMetricsServer = (getMetrics) => {
  const server = http.createServer(async (req, res) => {
    if (req.url !== "/metrics") return res.writeHead(404).end();
    try {
      const body = await getMetrics();
      res.setHeader("Content-Type", client.register.contentType);
      res.end(body);
    } catch (err) {
      logger.error({ err }, "Failed to collect metrics");
      res.writeHead(500).end();
    }
  });

  server.listen(METRICS_PORT, () => {
    logger.info(`Metrics available at http://localhost:${METRICS_PORT}/metrics`);
  });
  return server;
};

const port = process.env.PORT || 8000; // Default port if PORT is not set

/**
 * Connects to the database, starts the server,
 * and registers shutdown handlers. Exits the process if startup fails.
 */
async function startApp() {
  try {
    // Indexes come from the schemas: built on connect outside production, by `npm run db:indexes:prod` in production
    await connectDB();

    const { apolloServer } = await startServer(port);

    // Connect the notification queue now, so the first notification doesn't wait for it
    getNotificationQueue();

    /**
     * Stops the server gracefully, letting in-flight requests finish before exiting.
     * @param {string} signal The OS signal received, e.g. "SIGTERM".
     */
    const shutdown = async (signal) => {
      logger.info({ signal }, "Shutdown signal received");
      await apolloServer.stop(); // Drains open HTTP and WebSocket connections
      await getNotificationQueue().close();
      metricsServer?.close();
      process.exit(0);
    };

    // `once` prevents the shutdown from running twice.
    process.once("SIGTERM", () => shutdown("SIGTERM")); // Sent by Docker on container stop
    process.once("SIGINT", () => shutdown("SIGINT")); // Sent by Ctrl+C
  } catch (err) {
    logger.fatal({ err }, "Failed to start application");
    process.exit(1);
  }
}

// Single process in development for easier debugging; otherwise one worker
// per CPU core, with crashed workers restarted.
if (isDev) {
  metricsServer = startMetricsServer(() => client.register.metrics());
  startApp();
} else {
  // Workers hold the request metrics, so the primary serves them aggregated
  // across all workers; workers do not open the metrics port themselves.
  startWithCluster(startApp, () => {
    metricsServer = startMetricsServer(() => aggregator.clusterMetrics());
  });
}
