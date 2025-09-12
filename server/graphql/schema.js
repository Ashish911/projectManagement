import { GraphQLSchema, GraphQLObjectType } from "graphql";
import { userResolvers } from "./resolvers/user.resolver.js";
import { userType, AuthType } from "./types/user.type.js";

// Root Query
const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",
    fields: {
        ...userResolvers.Query,
        // spread in queries from other resolvers
    },
});

// Mutations
const Mutation = new GraphQLObjectType({
    name: "Mutation",
    fields: {
        ...userResolvers.Mutation,
        // spread in mutations from other resolvers
    },
});

export default new GraphQLSchema({
    query: RootQuery,
    mutation: Mutation,
});