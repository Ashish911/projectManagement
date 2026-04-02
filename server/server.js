import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { unwrapResolverError } from "@apollo/server/errors";
import schema from "./graphql/schema.js";
import jwt from "jsonwebtoken";
import { AppError } from "./errors/AppError.js";
import { apiLimiter } from "./middleware/rateLimiter.js";

const PUBLIC_OPERATIONS = [
  "LoginMutation",
  "RegisterMutation",
  "ForgotPasswordMutation",
  "ResetPasswordMutation",
];

const isDev = process.env.NODE_ENV === "development";

export const createServer = async () => {
  const server = new ApolloServer({
    schema,
    formatError: (formattedError, error) => {
      const originalError = unwrapResolverError(error);

      // If it's our custom AppError return structured response
      if (originalError instanceof AppError) {
        return {
          message: originalError.message,
          extensions: {
            code: originalError.code,
            statusCode: originalError.statusCode,
          },
        };
      }

      // Hide internal errors in production
      if (process.env.NODE_ENV === "production") {
        return {
          message: "Internal server error",
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        };
      }

      // In development return full error
      return formattedError;
    },
  });

  return server;
};

export const startServer = async (port = 8000) => {
  const server = await createServer();

  // API routes
  const { url } = await startStandaloneServer(server, {
    context: async ({ req }) => {
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

      if (isDev) {
        apiLimiter(ip, operation);
      }

      if (!PUBLIC_OPERATIONS.includes(operation || "")) {
        if (auth.startsWith("Bearer ")) {
          const token = auth.replace("Bearer ", "");
          try {
            user = jwt.verify(token, process.env.SECRET_KEY);
          } catch (err) {
            // Invalid token
            throw new Error("Invalid or expired token. Please log in again.");
          }
        } else {
          throw new Error(
            "Authorization required. Please provide a Bearer token.",
          );
        }

        return { user };
      }
    },
    listen: { port, path: "/graphql" },
  });

  console.log(`Server running at ${url}`);
  return server;
};
