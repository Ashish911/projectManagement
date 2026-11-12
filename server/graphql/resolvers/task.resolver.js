import { TaskService } from "../../services/task.service.js";

export const taskResolvers = {
  Query: {
    tasks: async (_, { projectId }, context) =>
      await TaskService.getTasks(projectId, context),
    task: async (_, { id }, context) => await TaskService.getTask(id, context),
    allTasks: async (_, args, context) => await TaskService.getAllTasks(context),
  },
  Mutation: {
    createTask: async (_, args, context) =>
      await TaskService.createTask(args, context),
    updateTask: async (_, args, context) =>
      await TaskService.updateTask(args, context),
    updateTaskStatus: async (_, { id, status, reason }, context) =>
      await TaskService.updateTaskStatus(id, status, context, reason),
    deleteTask: async (_, { id }, context) =>
      await TaskService.deleteTask(id, context),
  },
};
