/**
 * Apollo Server setup: GraphQL over HTTP and WebSocket on /graphql, JWT auth,
 * metrics, depth limiting, error formatting, health checks and graceful shutdown.
 */

import { randomUUID } from "crypto";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { unwrapResolverError } from "@apollo/server/errors";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import express from "express";
import http from "http";
import cors from "cors";
import schema from "./graphql/schema.js";
import jwt from "jsonwebtoken";
import { GraphQLError } from "graphql";
import { AppError } from "./errors/AppError.js";
import { UnauthorizedError } from "./errors/errors.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import depthLimit from "graphql-depth-limit";
import { checkReadiness } from "./config/health.js";

import logger from "./config/logger.js";
import {
  graphqlRequestCounter,
  graphqlRequestDuration,
} from "./config/metrics.js";

/** Operation names that skip JWT auth; must match the client's `operationName` exactly. */
const PUBLIC_OPERATIONS = [
  "LoginMutation",
  "RegisterMutation",
  "ForgotPasswordMutation",
  "ResetPasswordMutation",
];

const isDev = process.env.NODE_ENV === "development";

// ── Prometheus metrics plugin ─────────────────────────────────────────────────
/**
 * Records request count, status and duration per operation after each response.
 * Requests rejected during auth never get here; buildHttpContext counts those.
 */
const metricsPlugin = {
  async requestDidStart() {
    return {
      async willSendResponse({ contextValue, errors }) {
        const { operation, startTime, logger } = contextValue ?? {};
        if (!startTime || !operation) return; // No HTTP context, e.g. a WebSocket operation

        const duration = Date.now() - startTime;
        const status = errors?.length ? "error" : "success";

        graphqlRequestCounter.inc({ operation, status });
        graphqlRequestDuration.observe({ operation }, duration);

        logger?.info({ duration, status }, "Request completed");
      },
    };
  },
};

// ── WebSocket auth ────────────────────────────────────────────────────────────
/**
 * Builds the context for WebSocket subscriptions from the `connection_init` params.
 *
 * @param {{ connectionParams: Record<string, string> }} ctx  Params sent by the client.
 * @returns {Promise<{ user: object }>} Decoded JWT payload.
 * @throws {Error} If the Bearer token is missing, invalid or expired.
 */
const buildWsContext = async ({ connectionParams }) => {
  const auth =
    connectionParams?.authorization || connectionParams?.Authorization || "";
  if (!auth.startsWith("Bearer ")) {
    throw new Error("Authorization required for subscriptions.");
  }
  const token = auth.replace("Bearer ", "");
  try {
    const user = jwt.verify(token, process.env.SECRET_KEY);
    return { user };
  } catch {
    throw new Error("Invalid or expired token.");
  }
};

// ── HTTP auth ───────────────────────────────────────────────────────────────
/**
 * Builds the resolver `context` for each HTTP request: request ID, logger,
 * dev rate limiting and JWT auth. Public operations get `user: null`.
 *
 * @param {{ req: import("express").Request }} ctx  Express request from Apollo.
 * @returns {Promise<object>} Context with user, reqId, logger, operation and startTime.
 * @throws {Error} If a protected operation has a missing or invalid token.
 */
export const buildHttpContext = async ({ req }) => {
  const start = Date.now();
  const reqId = randomUUID();

  // Prefer the leftmost IP in X-Forwarded-For (set by load balancers/proxies).
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown";

  let user = null;
  const auth = req.headers.authorization || "";

  /** Returns the first named query/mutation/subscription in `query`, or null. */
  function extractOperationName(query) {
    const match = query?.match(/(query|mutation|subscription)\s+(\w+)/);
    return match ? match[2] : null;
  }

  // Prefer the explicit operationName field; fall back to parsing the query string.
  const rawOperation =
    req.body?.operationName || extractOperationName(req.body?.query);

  // The name is client-controlled and used as a metric label, so only accept
  // plain identifiers; anything else is grouped as "unknown".
  const operation = /^\w{1,64}$/.test(rawOperation ?? "")
    ? rawOperation
    : "unknown";

  // Child logger carries reqId, operation, and IP so every log line is traceable.
  let reqLogger = logger.child({ reqId, operation, ip });

  reqLogger.info("Incoming request");

  // Dev only; production rate limiting is handled by AWS infrastructure.
  if (isDev) {
    apiLimiter(ip, operation);
  }

  // ── JWT authentication ────────────────────────────────────────────────
  // Every operation outside PUBLIC_OPERATIONS needs a valid Bearer token.
  if (!PUBLIC_OPERATIONS.includes(operation)) {
    // Rejected requests never reach metricsPlugin, so record them here.
    const rejectAuth = (reason, message) => {
      graphqlRequestCounter.inc({ operation, status: "unauthenticated" });
      reqLogger.warn({ reason }, "Authentication failed");
      // Apollo only honours `extensions.http` on a GraphQLError, so wrap the AppError
      // to get a 401 response instead of the default 500 for context failures.
      const appError = new UnauthorizedError(message);
      throw new GraphQLError(message, {
        originalError: appError,
        extensions: {
          code: appError.code,
          statusCode: appError.statusCode,
          http: { status: appError.statusCode },
        },
      });
    };

    if (!auth.startsWith("Bearer ")) {
      rejectAuth(
        "missing_token",
        "Authorization required. Please provide a Bearer token.",
      );
    }

    const token = auth.replace("Bearer ", "");
    try {
      user = jwt.verify(token, process.env.SECRET_KEY);
    } catch {
      rejectAuth(
        "invalid_token",
        "Invalid or expired token. Please log in again.",
      );
    }

    // Tag every later log line for this request with the caller.
    reqLogger = reqLogger.child({ userId: user.id });
  }

  // Public operations get the same context, with `user` left as null.
  return {
    user, // Decoded JWT payload: { id, email, role }, or null
    reqId, // UUID for correlating this request's logs
    logger: reqLogger, // Request-scoped logger
    operation, // Used by metricsPlugin as a label
    startTime: start, // Epoch ms, used by metricsPlugin for duration
  };
};

// ── Apollo Server factory ─────────────────────────────────────────────────────
/**
 * Creates a configured ApolloServer (plugins, depth limit, error formatting).
 *
 * @param {http.Server | null} httpServer  Server to drain on shutdown; null in tests.
 * @returns {Promise<ApolloServer>} Server instance, not yet started.
 */
export const createServer = async (httpServer) => {
  return new ApolloServer({
    schema,
    plugins: [
      // Only attach the drain plugin when an HTTP server is provided (i.e. not in unit tests).
      ...(httpServer
        ? [ApolloServerPluginDrainHttpServer({ httpServer })]
        : []),
      metricsPlugin,
    ],
    validationRules: [depthLimit(7)], // Reject queries nested deeper than 7 levels
    formatError: (formattedError, error) => {
      // unwrapResolverError strips the GraphQL wrapper so we can inspect the original throw.
      // Context (auth) failures aren't resolver errors, so also check their originalError.
      const unwrapped = unwrapResolverError(error);
      const originalError =
        unwrapped instanceof AppError ? unwrapped : unwrapped?.originalError;

      // Known application errors — return structured response with code + statusCode.
      if (originalError instanceof AppError) {
        logger.warn(
          {
            code: originalError.code,
            statusCode: originalError.statusCode,
            message: originalError.message,
          },
          "App error",
        );
        return {
          message: originalError.message,
          extensions: {
            code: originalError.code,
            statusCode: originalError.statusCode,
          },
        };
      }

      // Unknown errors in production — hide internals, log the full error server-side.
      if (process.env.NODE_ENV === "production") {
        logger.error({ err: error }, "Unhandled internal error");
        return {
          message: "Internal server error",
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        };
      }

      // Outside production, pass the error through so stack traces are visible.
      return formattedError;
    },
    // Schema introspection and stack traces are dev-only to avoid leaking internals.
    introspection: process.env.NODE_ENV !== "production",
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== "production",
  });
};

// ── Server bootstrap ──────────────────────────────────────────────────────────
/**
 * Starts Express (GraphQL and health routes), the WebSocket server and Apollo
 * on one port, and begins listening.
 *
 * @param {number} [port=8000]  Port for both HTTP and WebSocket traffic.
 * @returns {Promise<{ apolloServer: ApolloServer, httpServer: http.Server }>} Running servers.
 */
export const startServer = async (port = 8000) => {
  const app = express();
  app.use(express.json());

  // ── Health checks ───────────────────────────────────────────────────────────
  // Plain HTTP (no GraphQL, no auth) so load balancers and ECS can probe them.
  app.get("/health/live", (_, res) => res.json({ status: "ok" }));
  app.get("/health/ready", async (_, res) => {
    const { ready, checks } = await checkReadiness();
    res
      .status(ready ? 200 : 503)
      .json({ status: ready ? "ok" : "unavailable", checks });
  });

  const httpServer = http.createServer(app);

  // ── WebSocket server ────────────────────────────────────────────────────────
  // Same port and path as HTTP: `ws` takes Upgrade requests, Express handles POSTs.
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  // Serve GraphQL subscriptions over the socket; the handle is disposed on shutdown.
  const wsCleanup = useServer(
    {
      schema,
      context: buildWsContext,
      // Reject a bad token once at connect time (close code 4403) instead of on every subscribe
      onConnect: async (ctx) => {
        try {
          await buildWsContext(ctx);
          return true;
        } catch {
          return false;
        }
      },
      onError: (_, __, errors) =>
        logger.error({ errors }, "WebSocket subscription error"),
    },
    wsServer,
  );

  const apolloServer = await createServer(httpServer);

  // ── WebSocket graceful shutdown ─────────────────────────────────────────────
  // Close open subscriptions when apolloServer.stop() drains the server.
  apolloServer.addPlugin({
    async serverWillStart() {
      return {
        async drainServer() {
          await wsCleanup.dispose();
        },
      };
    },
  });

  await apolloServer.start();

  // ── GraphQL HTTP endpoint ───────────────────────────────────────────────────
  app.use(
    "/graphql",
    cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }),
    expressMiddleware(apolloServer, {
      context: buildHttpContext,
    }),
  );

  await new Promise((resolve) => httpServer.listen({ port }, resolve));

  logger.info(`Server running at http://localhost:${port}/graphql`);
  logger.info(`WebSocket subscriptions at ws://localhost:${port}/graphql`);

  return { apolloServer, httpServer };
};
