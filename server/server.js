import express from "express";
import cors from "cors";
import {graphqlHTTP} from "express-graphql";
import schema  from "/graphql/schema.js";

export const server = () => {
    const server = express();

    server.use(express.json());
    server.use(cors());

    // API routes
    server.use(
        "/graphql",
        graphqlHTTP((request, response, graphQLParams) => ({
            schema,
            graphiql: process.env.NODE_ENV == "development",
            context: {
                request: request,
                test: "Example context value",
            },
        }))
    );

    return server;
};