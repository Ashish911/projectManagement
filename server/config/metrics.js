// Prometheus metrics for the API. Recorded by the metrics plugin in server.js.
import client from "prom-client";

// Collect default Node.js metrics (CPU, memory, event loop lag etc.)
client.collectDefaultMetrics();

/**
 * Counts GraphQL requests.
 * Labels: `operation` (operation name) and `status` ("success" or "error").
 */
export const graphqlRequestCounter = new client.Counter({
  name: "graphql_requests_total",
  help: "Total number of GraphQL requests",
  labelNames: ["operation", "status"],
});

/**
 * Tracks how long GraphQL requests take, in milliseconds.
 * Label: `operation` (operation name).
 */
export const graphqlRequestDuration = new client.Histogram({
  name: "graphql_request_duration_ms",
  help: "GraphQL request duration in milliseconds",
  labelNames: ["operation"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000], // Latency buckets in ms, from 10ms to 2s
});

// Shared Prometheus client, used to serve all metrics at /metrics.
export { client };
