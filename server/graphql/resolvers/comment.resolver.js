import { CommentService } from "../../services/comment.service.js";

export const commentResolvers = {
  Query: {
    taskComments: async (_, { taskId }, context) =>
      await CommentService.getTaskComments(taskId, context),
    subTaskComments: async (_, { subTaskId }, context) =>
      await CommentService.getSubTaskComments(subTaskId, context),
  },
  Mutation: {
    addTaskComment: async (_, args, context) =>
      await CommentService.addTaskComment(args, context),
    addSubTaskComment: async (_, args, context) =>
      await CommentService.addSubTaskComment(args, context),
    updateComment: async (_, args, context) =>
      await CommentService.updateComment(args, context),
    deleteComment: async (_, { id }, context) =>
      await CommentService.deleteComment(id, context),
  },
};
