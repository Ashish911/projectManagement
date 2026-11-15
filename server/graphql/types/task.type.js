import { User, Project, SubTask } from "../../models/import.js";
import {
  GraphQLInt,
  GraphQLString,
  GraphQLObjectType,
  GraphQLID,
  GraphQLNonNull,
  GraphQLList,
} from "graphql";
import { UserType, ProjectType, SubTaskType } from "./import.type.js";

const toIso = (value) => (value ? new Date(value).toISOString() : null);

/** Counts of a task's subtasks, for "2/3" chips without loading the subtasks. */
const SubTaskStatsType = new GraphQLObjectType({
  name: "SubTaskStats",
  fields: {
    done: { type: new GraphQLNonNull(GraphQLInt) },
    total: { type: new GraphQLNonNull(GraphQLInt) },
  },
});

export const TaskType = new GraphQLObjectType({
  name: "Task",
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    priority: { type: new GraphQLNonNull(GraphQLString) },
    // Optional: tasks can be created without a deadline
    deadline: { type: GraphQLString, resolve: (t) => toIso(t.deadline) },
    currentStatus: { type: new GraphQLNonNull(GraphQLString) },
    createdAt: { type: GraphQLString, resolve: (t) => toIso(t.createdAt) },
    updatedAt: { type: GraphQLString, resolve: (t) => toIso(t.updatedAt) },
    resolvedAt: { type: GraphQLString, resolve: (t) => toIso(t.resolvedAt) },
    // The caller's own subtasks, attached by allTasks only (null elsewhere): a task is "my work"
    // when it's assigned to me or has one of these (TSK-05)
    mySubTasks: {
      type: new GraphQLList(new GraphQLNonNull(SubTaskType)),
      resolve: (t) => t.mySubTasks ?? null,
    },
    subTaskStats: {
      type: new GraphQLNonNull(SubTaskStatsType),
      resolve: async (parent) => {
        const task = parent.id ?? parent._id;
        const [total, done] = await Promise.all([
          SubTask.countDocuments({ task }),
          SubTask.countDocuments({ task, currentStatus: "RESOLVED" }),
        ]);
        return { done, total };
      },
    },
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
  }),
});
