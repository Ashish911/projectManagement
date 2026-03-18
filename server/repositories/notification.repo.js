import { Notification } from "../models/import.js"

export const NotificationRepo = {
    find: () => Notification.find().lean(),
    findById: (id) => Notification.findById(id).lean(),
    findByUser: (userId) => Notification.find({ user: userId}).lean(),
    create: async (notification) => await new Notification(notification).save(),
    update: (id, notification) => Notification.findByIdAndUpdate(id, { $set: notification }, { new: true, runValidators: true }).lean(),
    delete: (id) => Notification.findByIdAndDelete(id).lean()
}