import { Client } from "../models/import.js";

export const ClientRepo = {
  find: async () => (await Client.find()).map((c) => c.toObject()),
  findById: async (id) => (await Client.findById(id))?.toObject() ?? null,
  findByAssignedAdmin: async (adminId) =>
    (await Client.findOne({ assignedAdmin: adminId }))?.toObject() ?? null,
  findByUser: async (userId) =>
    (await Client.find({ user: userId })).map((c) => c.toObject()),
  findByEmail: async (email) =>
    (await Client.findOne({ email }))?.toObject() ?? null,
  create: async (data) => (await new Client(data).save()).toObject(),
  update: async (id, data) =>
    (
      await Client.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true },
      )
    )?.toObject() ?? null,
  delete: async (id) =>
    (await Client.findByIdAndDelete(id))?.toObject() ?? null,
};
