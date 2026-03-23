import { SubTaskService } from "../../services/sub-task.service.js";

export const subTaskResolvers = {
  Query: {
    subTasks: async (_, { taskId }, context) =>
      await SubTaskService.getSubTasks(taskId, context),
    subTask: async (_, { id }, context) =>
      await SubTaskService.getSubTask(id, context),
  },
  Mutation: {
    createSubTask: async (_, args, context) =>
      await SubTaskService.createSubTask(args, context),
    updateSubTask: async (_, args, context) =>
      await SubTaskService.updateSubTask(args, context),
    updateSubTaskStatus: async (_, { id, status }, context) =>
      await SubTaskService.updateSubTaskStatus(id, status, context),
    deleteSubTask: async (_, { id }, context) =>
      await SubTaskService.deleteSubTask(id, context),
  },
};
