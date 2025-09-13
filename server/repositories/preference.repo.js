import { Preference } from "../models/import.js"

export const PreferenceRepo = {
    find: () => Preference.find().lean(),
    findById: (id) => Preference.findById(id).lean(),
    create: (preference) => Preference.create(preference).save(),
    update: (id, preference) => Preference.findByIdAndUpdate(id, { $set: preference }, { new: true, runValidators: true }).lean(),
    delete: (id) => Preference.findByIdAndDelete(id).lean()
}