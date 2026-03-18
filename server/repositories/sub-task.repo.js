import { SubTask } from "../models/import.js"

export const SubTaskRepo = {
    find: () => SubTask.find().lean(),
    findById: (id) => SubTask.findById(id).lean(),
    create: async (subTask) => await new SubTask(subTask).save(),
    update: (id, subTask) => SubTask.findByIdAndUpdate(id, { $set: subTask }, { new: true, runValidators: true }).lean(),
    delete: (id) => SubTask.findByIdAndDelete(id).lean()
}