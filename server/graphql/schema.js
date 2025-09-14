import { GraphQLObjectType, GraphQLSchema, GraphQLEnumType,
    GraphQLID, GraphQLList, GraphQLNonNull, GraphQLString} from "graphql";

import {ProjectType, ClientType, AuthType, UserType} from "./types/import.type.js";

import { userResolvers, projectResolvers, clientResolvers,
    taskResolvers, preferenceResolvers, subTaskResolvers,
    notificationResolvers } from "./resolvers/import.resolver.js";

// Root Query
const RootQuery = new GraphQLObjectType({
    name: "RootQueryType",
    fields: {
        profile: {
            type: UserType,
            resolve: userResolvers.Query.profile,
        },
        projects: {
            type: new GraphQLList(ProjectType),
            resolve: projectResolvers.Query.getProjects
        },
        project: {
            type: ProjectType,
            args: { id: { type: new GraphQLNonNull(GraphQLID) } },
            resolve: projectResolvers.Query.project
        },
        clients: {
            type: new GraphQLList(ClientType),
            args: { id: { type: new GraphQLNonNull(GraphQLID) } },
            resolve: clientResolvers.Query.clients,
        },
        client: {
            type: ClientType,
            args: { id: { type: new GraphQLNonNull(GraphQLID) } },
            resolve: clientResolvers.Query.client,
        }

    },
});

// Mutations
const Mutation = new GraphQLObjectType({
    name: "Mutation",
    fields: {
        login: {
            type: AuthType,
            args: {
                email: {type: new GraphQLNonNull(GraphQLString)},
                password: {type: new GraphQLNonNull(GraphQLString)},
            },
            resolve: userResolvers.Mutation.login,
        },
        register: {
            type: UserType,
            args: {
                name: {type: new GraphQLNonNull(GraphQLString)},
                email: {type: new GraphQLNonNull(GraphQLString)},
                number: {type: new GraphQLNonNull(GraphQLString)},
                dob: {type: new GraphQLNonNull(GraphQLString)},
                password: {type: new GraphQLNonNull(GraphQLString)},
                role: {
                    type: new GraphQLEnumType({
                        name: "UserRole",
                        values: {
                            su: {value: "SUPER_ADMIN"},
                            ca: {value: "CLIENT_ADMIN"},
                            u: {value: "USER"},
                        },
                    }),
                    defaultValue: "USER",
                },
                gender: {
                    type: new GraphQLEnumType({
                        name: "Gender",
                        values: {
                            M: {value: "MALE"},
                            F: {value: "FEMALE"},
                            O: {value: "OTHERS"},
                        },
                    }),
                    defaultValue: "MALE",
                },
            },
            resolve: userResolvers.Mutation.register,
        }
    },
});

const schema = new GraphQLSchema({
    query: RootQuery,
    mutation: Mutation,
});

export default schema;
