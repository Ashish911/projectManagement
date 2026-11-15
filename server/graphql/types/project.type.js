import {
  GraphQLID,
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLBoolean,
} from "graphql";
import { Client, User } from "../../models/import.js";
import { ClientType, UserType } from "./import.type.js";
import { managesProject } from "../../services/access.js";

export const ProjectType = new GraphQLObjectType({
  name: "Project",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    dueDate: {
      type: GraphQLString,
      resolve: (p) => (p.dueDate ? new Date(p.dueDate).toISOString() : null),
    },
    client: {
      type: ClientType,
      resolve: async (parent) => {
        return await Client.findById(parent.clientId);
      },
    },
    // Whether the caller runs this project (SUPER_ADMIN, or its client's CLIENT_ADMIN), so the UI shows admin controls
    canManage: {
      type: new GraphQLNonNull(GraphQLBoolean),
      resolve: async (parent, _, { user }) => await managesProject(parent, user),
    },
    user: {
      type: new GraphQLList(UserType),
      resolve: async (parent) => {
        return await User.find({ _id: { $in: parent.assignedUsers } });
      },
    },
  }),
});
