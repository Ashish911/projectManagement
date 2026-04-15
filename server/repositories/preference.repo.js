import { Preference } from "../models/import.js";

export const PreferenceRepo = {
  find: async () => (await Preference.find()).map((p) => p.toObject()),
  findById: async (id) => (await Preference.findById(id))?.toObject() ?? null,
  findByUser: async (userId) =>
    (await Preference.findOne({ user: userId }))?.toObject() ?? null,
  create: async (data) => (await new Preference(data).save()).toObject(),
  update: async (id, data) =>
    (
      await Preference.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true },
      )
    )?.toObject() ?? null,
  delete: async (id) =>
    (await Preference.findByIdAndDelete(id))?.toObject() ?? null,
};
