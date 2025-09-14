import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { Client, User }  from "../../models/import.js";
import { ClientType, UserType } from "./import.type.js";

export const ProjectType = new GraphQLObjectType({
    name: "Project",
    fields: () => ({
        id: { type: new GraphQLNonNull(GraphQLID)},
        name: { type: new GraphQLNonNull(GraphQLString)},
        description: { type: new GraphQLNonNull(GraphQLString)},
        status: { type: new GraphQLNonNull(GraphQLString)},
        client: {
            type: ClientType,
            resolve: (parent, args) => {
                return Client.findById(parent.clientId);
            },
        },
        user: {
            type: UserType,
            resolve: (parent, args) => {
                return User.findById(parent.assignedUser);
            },
        },
    }),
});