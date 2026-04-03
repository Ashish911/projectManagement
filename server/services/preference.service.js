import { NotFoundError } from "../errors/errors.js";
import { PreferenceRepo } from "../repositories/import.repo.js";
import { updatePreferenceSchema } from "../validation/schema.js";
import { validate } from "../validation/validate.js";

export const PreferenceService = {
  async getPreference(context) {
    const { user } = context;

    const preference = await PreferenceRepo.findByUser(user.id);

    if (!preference) throw new NotFoundError("Preference not found");

    return preference;
  },

  async updatePreference(data, context) {
    validate(updatePreferenceSchema, data);

    const { user, logger } = context;

    const preference = await PreferenceRepo.findByUser(user.id);

    if (!preference) throw new NotFoundError("Preference not found");

    const updated = await PreferenceRepo.update(preference._id, {
      ...(data.theme && { theme: data.theme }),
      ...(data.language && { language: data.language }),
    });

    logger.info(
      {
        audit: true,
        userId: user.id,
        action: "UPDATE_PREFERENCE",
      },
      "AUDIT",
    );

    return updated;
  },
};
