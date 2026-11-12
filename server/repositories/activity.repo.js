import { Activity } from "../models/import.js";

export const ActivityRepo = {
  create: async (data) => (await new Activity(data).save()).toObject(),
  findRecent: async (limit) =>
    (await Activity.find().sort({ createdAt: -1 }).limit(limit)).map((a) => a.toObject()),
  findByProjects: async (projectIds, limit) =>
    (await Activity.find({ project: { $in: projectIds } }).sort({ createdAt: -1 }).limit(limit)).map((a) => a.toObject()),
};
