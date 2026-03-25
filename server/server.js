import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import schema from "./graphql/schema.js";
import jwt from "jsonwebtoken";

const PUBLIC_OPERATIONS = [
  "LoginMutation",
  "RegisterMutation",
  "ForgotPasswordMutation",
  "ResetPasswordMutation",
];

export const createServer = async () => {
  const server = new ApolloServer({ schema });

  return server;
};

export const startServer = async (port = 8000) => {
  const server = await createServer();

  // API routes
  const { url } = await startStandaloneServer(server, {
    context: async ({ req }) => {
      let user = null;
      const auth = req.headers.authorization || "";

      function extractOperationName(query) {
        const match = query.match(/(query|mutation|subscription)\s+(\w+)/);
        return match ? match[2] : null;
      }

      const operation =
        req.body?.operationName || extractOperationName(req.body?.query);

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
