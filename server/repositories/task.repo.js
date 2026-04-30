import { Task } from "../models/import.js";

export const TaskRepo = {
  find: async () => (await Task.find()).map((t) => t.toObject()),
  findById: async (id) => (await Task.findById(id))?.toObject() ?? null,
  create: async (data) => (await new Task(data).save()).toObject(),
  update: async (id, data) =>
    (
      await Task.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true },
      )
    )?.toObject() ?? null,
  delete: async (id) => (await Task.findByIdAndDelete(id))?.toObject() ?? null,
  findByProject: async (projectId) =>
    (await Task.find({ project: projectId })).map((t) => t.toObject()),
};
