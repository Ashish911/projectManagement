import {
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLBoolean,
} from "graphql";
import { User } from "../../models/import.js";
import { UserType } from "./import.type.js";

export const ClientType = new GraphQLObjectType({
  name: "Client",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: GraphQLString }, // Optional: clients may be created without contact details
    phone: { type: GraphQLString },
    deleteRequest: { type: new GraphQLNonNull(GraphQLBoolean) },
    createdAt: {
      type: GraphQLString,
      resolve: (c) => (c.createdAt ? new Date(c.createdAt).toISOString() : null),
    },
    assignedAdmin: {
      type: UserType,
      resolve: async (parent) => {
        if (!parent.assignedAdmin) return null;
        return await User.findById(parent.assignedAdmin);
      },
    },
  },
});
