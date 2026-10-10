import {
  GraphQLID,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import { User } from "../../models/import.js";
import { UserType } from "./import.type.js";

// Dates come back as Date objects; send ISO strings rather than epoch numbers
const toIso = (value) => (value ? new Date(value).toISOString() : null);

export const CommentType = new GraphQLObjectType({
  name: "Comment",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    taskId: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: (parent) => parent.taskId.toString(),
    },
    subTaskId: {
      type: GraphQLID,
      resolve: (parent) => parent.subTaskId?.toString() ?? null,
    },
    author: {
      type: UserType,
      resolve: async (parent) => {
        return await User.findById(parent.userId);
      },
    },
    createdAt: {
      type: GraphQLString,
      resolve: (parent) => toIso(parent.createdAt),
    },
    updatedAt: {
      type: GraphQLString,
      resolve: (parent) => toIso(parent.updatedAt),
    },
  }),
});
