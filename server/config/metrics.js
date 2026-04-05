import client from "prom-client";

// Collect default Node.js metrics (CPU, memory, event loop lag etc.)
client.collectDefaultMetrics();

export const graphqlRequestCounter = new client.Counter({
  name: "graphql_requests_total",
  help: "Total number of GraphQL requests",
  labelNames: ["operation", "status"],
});

export const graphqlRequestDuration = new client.Histogram({
  name: "graphql_request_duration_ms",
  help: "GraphQL request duration in milliseconds",
  labelNames: ["operation"],
  buckets: [10, 50, 100, 200, 500, 1000, 2000],
});

export { client };
