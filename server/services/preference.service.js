import { NotFoundError } from "../errors/errors.js";
import { PreferenceRepo } from "../repositories/import.repo.js";

export const PreferenceService = {
  async getPreference(context) {
    const { user } = context;

    const preference = await PreferenceRepo.findByUser(user.id);

    if (!preference) throw new NotFoundError("Preference not found");

    return preference;
  },

  async updatePreference(data, context) {
    const { user } = context;

    const preference = await PreferenceRepo.findByUser(user.id);

    if (!preference) throw new NotFoundError("Preference not found");

    return await PreferenceRepo.update(preference._id, {
      ...(data.theme && { theme: data.theme }),
      ...(data.language && { language: data.language }),
    });
  },
};
