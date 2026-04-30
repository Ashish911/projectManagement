import { SubTask } from "../models/import.js";

export const SubTaskRepo = {
  find: async () => (await SubTask.find()).map((s) => s.toObject()),
  findById: async (id) => (await SubTask.findById(id))?.toObject() ?? null,
  create: async (data) => (await new SubTask(data).save()).toObject(),
  update: async (id, data) =>
    (
      await SubTask.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true },
      )
    )?.toObject() ?? null,
  delete: async (id) =>
    (await SubTask.findByIdAndDelete(id))?.toObject() ?? null,
  findByTask: async (taskId) =>
    (await SubTask.find({ task: taskId })).map((s) => s.toObject()),
};
