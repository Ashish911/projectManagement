import {
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
} from "graphql";
import { Client, User } from "../../models/import.js";
import { ClientType, UserType } from "./import.type.js";

export const ProjectType = new GraphQLObjectType({
  name: "Project",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    client: {
      type: ClientType,
      resolve: async (parent) => {
        return await Client.findById(parent.clientId);
      },
    },
    user: {
      type: new GraphQLList(UserType),
      resolve: async (parent) => {
        return await User.find({ _id: { $in: parent.assignedUsers } });
      },
    },
  }),
});
