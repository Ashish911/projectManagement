import { Comment } from "../models/import.js";

export const CommentRepo = {
  findById: async (id) => (await Comment.findById(id))?.toObject() ?? null,
  create: async (data) => (await new Comment(data).save()).toObject(),
  update: async (id, data) =>
    (
      await Comment.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true },
      )
    )?.toObject() ?? null,
  delete: async (id) =>
    (await Comment.findByIdAndDelete(id))?.toObject() ?? null,
  // Task-level thread only; sub-task comments also carry taskId, so exclude them
  findByTask: async (taskId) =>
    (
      await Comment.find({ taskId, subTaskId: { $exists: false } }).sort({
        createdAt: 1,
      })
    ).map((c) => c.toObject()),
  findBySubTask: async (subTaskId) =>
    (await Comment.find({ subTaskId }).sort({ createdAt: 1 })).map((c) =>
      c.toObject(),
    ),
  // Removes task-level and sub-task comments, since both carry taskId
  deleteByTask: async (taskId) => await Comment.deleteMany({ taskId }),
  deleteBySubTask: async (subTaskId) =>
    await Comment.deleteMany({ subTaskId }),
};
