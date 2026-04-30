import { User, Project } from "../../models/import.js";
import {
  GraphQLString,
  GraphQLObjectType,
  GraphQLID,
  GraphQLNonNull,
} from "graphql";
import { UserType, ProjectType } from "./import.type.js";

export const TaskType = new GraphQLObjectType({
  name: "Task",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    priority: { type: new GraphQLNonNull(GraphQLString) },
    deadline: { type: new GraphQLNonNull(GraphQLString) },
    currentStatus: { type: new GraphQLNonNull(GraphQLString) },
    assignedTo: {
      type: UserType,
      resolve: async (parent) => {
        return await User.findById(parent.assignedTo);
      },
    },
    createdBy: {
      type: UserType,
      resolve: async (parent) => {
        return await User.findById(parent.createdBy);
      },
    },
    project: {
      type: ProjectType,
      resolve: async (parent) => {
        return await Project.findById(parent.project);
      },
    },
  },
});
