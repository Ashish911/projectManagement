import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull } from "graphql";
import { User } from "../../models/import.js";
import { UserType } from "./import.type.js";

export const ClientType = new GraphQLObjectType({
    name: "Client",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID)},
        name: { type: new GraphQLNonNull(GraphQLString)},
        email: { type: new GraphQLNonNull(GraphQLString)},
        phone: { type: new GraphQLNonNull(GraphQLString)},
        user: {
            type: UserType,
            resolve: (parent, args) => {
                return User.findById(parent.assignedUser);
            },
        },
    },
});