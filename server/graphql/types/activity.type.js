import { GraphQLID, GraphQLNonNull, GraphQLObjectType, GraphQLString } from "graphql";
import { User, Project, Task } from "../../models/import.js";
import { UserType } from "./import.type.js";

/** Minimal project/task reference for a feed line. */
const RefType = new GraphQLObjectType({
  name: "ActivityRef",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
  },
});

export const ActivityType = new GraphQLObjectType({
  name: "Activity",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    action: { type: new GraphQLNonNull(GraphQLString) },
    summary: { type: new GraphQLNonNull(GraphQLString) },
    reason: { type: GraphQLString },
    oldRole: { type: GraphQLString, resolve: (a) => a.meta?.oldRole ?? null },
    newRole: { type: GraphQLString, resolve: (a) => a.meta?.newRole ?? null },
    createdAt: {
      type: GraphQLString,
      resolve: (a) => (a.createdAt ? new Date(a.createdAt).toISOString() : null),
    },
    actor: { type: UserType, resolve: async (a) => await User.findById(a.actor) },
    targetUser: { type: UserType, resolve: async (a) => (a.targetUser ? await User.findById(a.targetUser) : null) },
    project: {
      type: RefType,
      resolve: async (a) => (a.project ? await Project.findById(a.project, "name") : null),
    },
    task: {
      type: RefType,
      resolve: async (a) => {
        const t = a.task ? await Task.findById(a.task, "title") : null;
        return t ? { id: t.id, name: t.title } : null;
      },
    },
  },
});
