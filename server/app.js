import "./config/env.js";

// import dotenv from "dotenv";
import connectDB from "./config/db.js";
import { startServer } from "./server.js";
import http from "http";
import { client } from "./config/metrics.js";
import { createIndexes } from "./config/logger.js";
import { startWithCluster } from "./cluster.js";

// dotenv.config();

const isDev = process.env.NODE_ENV === "development";

const metricsServer = http.createServer(async (req, res) => {
  if (req.url === "/metrics") {
    res.setHeader("Content-Type", client.contentType);
    res.end(await client.register.metrics());
  } else {
    res.writeHead(404).end();
  }
});

metricsServer.listen(9090, () => {
  console.log("Metrics available at http://localhost:9090/metrics");
});

const port = process.env.PORT || 8000;

async function startApp() {
  try {
    // Connect DB first
    const db = await connectDB();
    await createIndexes(db);
    await startServer(port);
  } catch (err) {
    console.error("Failed to start application:", err);
    process.exit(1);
  }
}

if (isDev) {
  startApp();
} else {
  startWithCluster(startApp);
}
