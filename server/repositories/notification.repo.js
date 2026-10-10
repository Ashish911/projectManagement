import { Notification } from "../models/import.js";

export const NotificationRepo = {
  find: async () => (await Notification.find()).map((n) => n.toObject()),
  findById: async (id) => (await Notification.findById(id))?.toObject() ?? null,
  findByUser: async (userId) =>
    (await Notification.find({ user: userId }).sort({ createdAt: -1 })).map(
      (n) => n.toObject(),
    ),
  // Marks the user's unread notifications read in one write; limited to `ids` when given
  markRead: async (userId, ids) =>
    await Notification.updateMany(
      { user: userId, status: "UNREAD", ...(ids && { _id: { $in: ids } }) },
      { $set: { status: "READ" } },
    ),
  deleteByUser: async (userId) => await Notification.deleteMany({ user: userId }),
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
