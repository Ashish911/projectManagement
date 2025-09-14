import express from "express";
import cors from "cors";
import {graphqlHTTP} from "express-graphql";
import schema from "./graphql/schema.js";
import jwt from "jsonwebtoken";

const PUBLIC_OPERATIONS = ["LoginMutation", "RegisterMutation", "ForgotPasswordMutation", "ResetPasswordMutation"];

export const server = () => {
    const server = express();

    server.use(express.json());
    server.use(cors());

    // API routes
    server.use(
        "/graphql",
        graphqlHTTP((request, response, graphQLParams) => {
            let user = null;
            const auth = request.headers.authorization || "";

            function extractOperationName(query) {
                const match = query.match(/(query|mutation|subscription)\s+(\w+)/);
                return match ? match[2] : null;
            }

            const operation =
                graphQLParams?.operationName || extractOperationName(graphQLParams?.query);

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
                throw new Error("Authorization required. Please provide a Bearer token.");
            }
        }
        return {
            schema,
            graphiql: process.env.NODE_ENV === "development",
            context: {
                request,
                response,
                user,
            }
        }
        })
    );

    return server;
};