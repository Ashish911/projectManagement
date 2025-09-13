import { GraphQLID, GraphQLNonNull, GraphQLObjectType, GraphQLString } from "graphql/index.js";
import { User } from "../../models/import.js";
import { UserType } from "./import.type.js";

export const PreferenceType = new GraphQLObjectType({
    name: "Preference",
    fields: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        theme: { type: new GraphQLNonNull(GraphQLString) },
        language: { type: new GraphQLNonNull(GraphQLString) },
        user: {
            type: UserType,
            resolve: (parent, args) => {
                return User.findById(parent);
            },
        },
    },
});