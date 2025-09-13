import { Project } from '../models/import.js';

export const ProjectRepo = {
    find: () => Project.find().lean(),
    findById: (id) => Project.findById(id).lean(),
    create: (project) => Project.create(project).save(),
    update: (id, project) => Project.findByIdAndUpdate(id, { $set: project }, { new: true, runValidators: true }).lean(),
    delete: (id) => Project.findByIdAndDelete(id).lean()
}