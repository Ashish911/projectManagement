import { Task } from "../models/import.js"

export const TaskRepo = {
    find: () => Task.find().lean(),
    findById: (id) => Task.findById(id).lean(),
    create: (task) => Task.create(task).save(),
    update: (id, task) => Task.findByIdAndUpdate(id, { $set: task }, { new: true, runValidators: true }).lean(),
    delete: (id) => Task.findByIdAndDelete(id).lean()
}