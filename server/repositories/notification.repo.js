import { Notification } from "../models/Notification.js"

export const NotificationRepo = {
    find: () => Notification.find().lean(),
    findById: (id) => Notification.findById(id).lean(),
    create: (notification) => Notification.create(notification).save(),
    update: (id, notification) => Notification.findByIdAndUpdate(id, { $set: notification }, { new: true, runValidators: true }).lean(),
    delete: (id) => Notification.findByIdAndDelete(id).lean()
}