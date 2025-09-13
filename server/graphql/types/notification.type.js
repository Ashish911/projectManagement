import { GraphQLID, GraphQLNonNull, GraphQLObjectType, GraphQLString } from "graphql";
import { User } from "../../models/import.js";
import { UserType } from "./import.type.js";

export const NotificationType = new GraphQLObjectType({
    name: "Notification",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        content: { type: new GraphQLNonNull(GraphQLString) },
        status: { type: new GraphQLNonNull(GraphQLString) },
        user: {
            type: UserType,
            resolve: (parent, args) => {
                return User.findById(parent);
            },
        },
    },
});