/**
 * Cluster mode for non-development runs: one worker per CPU core, so the
 * single-threaded server can use every core. Workers share the listening port.
 */

import cluster from "cluster";
import os from "os";
import logger from "./config/logger.js";

// One worker per logical CPU core.
const numCPUs = os.cpus().length;

/**
 * Runs `startApp` in each worker; the primary forks and restarts workers.
 *
 * @param {() => Promise<void>} startApp  App bootstrap function from app.js.
 * @param {() => void} [onPrimary]        Extra setup for the primary only, e.g. the metrics server.
 * @returns {Promise<void>}
 */
export const startWithCluster = async (startApp, onPrimary) => {
  if (cluster.isPrimary) {
    onPrimary?.();
    logger.info(`Primary ${process.pid} running, forking ${numCPUs} workers`);

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    // Replace any worker that exits so the pool stays at full size.
    // There is no back-off, so a worker that fails on startup is re-forked in a loop.
    cluster.on("exit", (worker, code, signal) => {
      logger.warn(`Worker ${worker.process.pid} died — restarting`);
      cluster.fork();
    });
  } else {
    // Worker: boots its own DB connection and Apollo server.
    await startApp();
    logger.info(`Worker ${process.pid} started`);
  }
};
