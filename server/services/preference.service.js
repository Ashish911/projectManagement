import { PreferenceRepo } from "../repositories/import.repo.js";

export const PreferenceService = {
  async getPreference(context) {
    const { user } = context;

    return await PreferenceRepo.findByUser(user.id).orElseThrow(
      new Error("Preference not found"),
    );
  },

  async updatePreference(data, context) {
    const { user } = context;

    const preference = await PreferenceRepo.findByUser(user.id).orElseThrow(
      new Error("Preference not found"),
    );

    return await PreferenceRepo.update(preference._id, {
      ...(data.theme && { theme: data.theme }),
      ...(data.language && { language: data.language }),
    });
  },
};
