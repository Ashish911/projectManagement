import { User } from '../models/import.js';

export const UserRepo = {
    findById: (id) => User.findById(id).lean(),
    findByEmail: (email) => User.findOne({ email }),
    create: (user) => User.create(user).save(),
    update: (id, user) => User.findByIdAndUpdate(id, { $set: user }, { new: true, runValidators: true }).lean(),
    delete: (id) => User.findByIdAndDelete(id).lean()
}