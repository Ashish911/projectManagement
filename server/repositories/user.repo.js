import { User } from "../models/import.js";

export const UserRepo = {
  findById: async (id) => (await User.findById(id))?.toObject() ?? null,
  findByEmail: async (email) =>
    (await User.findOne({ email }))?.toObject() ?? null,
  create: async (data) => (await new User(data).save()).toObject(),
  update: async (id, data) =>
    (
      await User.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true },
      )
    )?.toObject() ?? null,
  delete: async (id) => (await User.findByIdAndDelete(id))?.toObject() ?? null,
};
