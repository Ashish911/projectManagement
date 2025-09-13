import { Client } from '../models/import.js';

export const ClientRepo = {
    find: () => Client.find().lean(),
    findById: (id) => Client.findById(id).lean(),
    create: (client) => Client.create(client).save(),
    update: (id, client) => Client.findByIdAndUpdate(id, { $set: client }, { new: true, runValidators: true }).lean(),
}