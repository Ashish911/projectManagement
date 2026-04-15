import { Notification } from "../models/import.js";

export const NotificationRepo = {
  find: async () => (await Notification.find()).map((n) => n.toObject()),
  findById: async (id) => (await Notification.findById(id))?.toObject() ?? null,
  findByUser: async (userId) =>
    (await Notification.find({ user: userId })).map((n) => n.toObject()),
  create: async (data) => (await new Notification(data).save()).toObject(),
  update: async (id, data) =>
    (
      await Notification.findByIdAndUpdate(
        id,
        { $set: data },
        { new: true, runValidators: true },
      )
    )?.toObject() ?? null,
  delete: async (id) =>
    (await Notification.findByIdAndDelete(id))?.toObject() ?? null,
};
