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
    email: { type: new GraphQLNonNull(GraphQLString) },
    phone: { type: new GraphQLNonNull(GraphQLString) },
    deleteRequest: { type: new GraphQLNonNull(GraphQLBoolean) },
    assignedAdmin: {
      type: UserType,
      resolve: (parent) => {
        return User.findById(parent.assignedAdmin);
      },
    },
  },
});
