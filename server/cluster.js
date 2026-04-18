import cluster from "cluster";
import os from "os";
import logger from "./config/logger.js";

const numCPUs = os.cpus().length;

export const startWithCluster = async (startApp) => {
  if (cluster.isPrimary) {
    logger.info(`Primary ${process.pid} running, forking ${numCPUs} workers`);

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
      logger.warn(`Worker ${worker.process.pid} died — restarting`);
      cluster.fork(); // auto restart dead workers
    });
  } else {
    // Each worker runs the full app
    await startApp();
    logger.info(`Worker ${process.pid} started`);
  }
};
