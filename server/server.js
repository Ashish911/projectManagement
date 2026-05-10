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
import { AppError } from "./errors/AppError.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import depthLimit from "graphql-depth-limit";
// graphql-query-complexity disabled: causes dual-module ESM/CJS conflict in Docker
// (GraphQLScalarType from .mjs vs .js — fix: npm overrides + docker rebuild)
// import { createComplexityRule, simpleEstimator } from "graphql-query-complexity";
import logger from "./config/logger.js";
import {
  graphqlRequestCounter,
  graphqlRequestDuration,
} from "./config/metrics.js";

const PUBLIC_OPERATIONS = [
  "LoginMutation",
  "RegisterMutation",
  "ForgotPasswordMutation",
  "ResetPasswordMutation",
];

const isDev = process.env.NODE_ENV === "development";

const metricsPlugin = {
  async requestDidStart() {
    return {
      async willSendResponse({ contextValue, errors }) {
        const { operation, startTime, logger } = contextValue ?? {};
        if (!startTime || !operation) return;

        const duration = Date.now() - startTime;
        const status = errors?.length ? "error" : "success";

        graphqlRequestCounter.inc({ operation, status });
        graphqlRequestDuration.observe({ operation }, duration);

        logger?.info({ duration, status }, "Request completed");
      },
    };
  },
};

// JWT auth for WebSocket connections — called once per connection
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

export const createServer = async (httpServer) => {
  return new ApolloServer({
    schema,
    plugins: [
      ...(httpServer
        ? [ApolloServerPluginDrainHttpServer({ httpServer })]
        : []),
      metricsPlugin,
    ],
    validationRules: [
      depthLimit(7),
    ],
    formatError: (formattedError, error) => {
      const originalError = unwrapResolverError(error);

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

      if (process.env.NODE_ENV === "production") {
        logger.error({ err: error }, "Unhandled internal error");
        return {
          message: "Internal server error",
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        };
      }

      return formattedError;
    },
    introspection: process.env.NODE_ENV !== "production",
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== "production",
  });
};

export const startServer = async (port = 8000) => {
  const app = express();
  app.use(express.json());

  const httpServer = http.createServer(app);

  // WebSocket server — shares the same port/path as HTTP
  // ws handles Upgrade requests; Express handles normal POSTs — no conflict
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  const wsCleanup = useServer(
    {
      schema,
      context: buildWsContext,
      onError: (_, __, errors) =>
        logger.error({ errors }, "WebSocket subscription error"),
    },
    wsServer,
  );

  const apolloServer = await createServer(httpServer);

  // Gracefully dispose WebSocket connections when Apollo shuts down
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

  app.use(
    "/graphql",
    cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }),
    expressMiddleware(apolloServer, {
      context: async ({ req }) => {
        const start = Date.now();
        const reqId = randomUUID();

        const ip =
          req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
          req.socket.remoteAddress ||
          "unknown";

        let user = null;
        const auth = req.headers.authorization || "";

        function extractOperationName(query) {
          const match = query.match(/(query|mutation|subscription)\s+(\w+)/);
          return match ? match[2] : null;
        }

        const operation =
          req.body?.operationName || extractOperationName(req.body?.query);

        const reqLogger = logger.child({ reqId, operation, ip });

        reqLogger.info("Incoming request");

        if (isDev) {
          apiLimiter(ip, operation);
        }

        if (!PUBLIC_OPERATIONS.includes(operation || "")) {
          if (auth.startsWith("Bearer ")) {
            const token = auth.replace("Bearer ", "");
            try {
              user = jwt.verify(token, process.env.SECRET_KEY);
            } catch (err) {
              throw new Error("Invalid or expired token. Please log in again.");
            }
          } else {
            throw new Error(
              "Authorization required. Please provide a Bearer token.",
            );
          }

          return {
            user,
            reqId,
            logger: reqLogger,
            operation,
            startTime: start,
          };
        }
      },
    }),
  );

  await new Promise((resolve) => httpServer.listen({ port }, resolve));

  console.log(`Server running at http://localhost:${port}/graphql`);
  console.log(`WebSocket subscriptions at ws://localhost:${port}/graphql`);

  return { apolloServer, httpServer };
};
