import { cache } from "../config/cache.js";
import { createLogger } from "../config/logger.js";
import { NotFoundError } from "../errors/errors.js";
import { PreferenceRepo } from "../repositories/import.repo.js";
import { updatePreferenceSchema } from "../validation/schema.js";
import { validate } from "../validation/validate.js";

export const PreferenceService = {
  async getPreference(context) {
    const { user } = context;

    const cacheKey = `preference:${user.id}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const preference = await PreferenceRepo.findByUser(user.id);
    if (!preference) throw new NotFoundError("Preference not found");

    await cache.set(cacheKey, preference);

    return preference;
  },

  async updatePreference(data, context) {
    validate(updatePreferenceSchema, data);

    const { user } = context;
    const logger = createLogger(context);

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

    await cache.invalidate(`preference:${user.id}`);

    return updated;
  },
};
