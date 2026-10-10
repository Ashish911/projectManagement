import { Project } from "../models/import.js";

export const ProjectRepo = {
  find: async () => (await Project.find()).map((p) => p.toObject()),
  findByClientId: async (clientId) =>
    (await Project.find({ clientId })).map((p) => p.toObject()),
  findById: async (id) => (await Project.findById(id))?.toObject() ?? null,
  create: async (data) => (await new Project(data).save()).toObject(),
  update: async (id, data) =>
    (
      await Project.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true },
      )
    )?.toObject() ?? null,
  findByAssignedUser: async (userId) =>
    (await Project.find({ assignedUsers: userId })).map((p) => p.toObject()),
  delete: async (id) =>
    (await Project.findByIdAndDelete(id))?.toObject() ?? null,
  // Used when a user is deleted: takes them off every team
  removeUserEverywhere: async (userId) =>
    await Project.updateMany({ assignedUsers: userId }, { $pull: { assignedUsers: userId } }),
};
