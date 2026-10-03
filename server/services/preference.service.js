import { cache } from "../config/cache.js";
import { createLogger } from "../config/logger.js";
import { NotFoundError } from "../errors/errors.js";
import { PreferenceRepo } from "../repositories/import.repo.js";
import { updatePreferenceSchema } from "../validation/schema.js";
import { validate } from "../validation/validate.js";

/** Per-user UI preferences (theme and language). */
export const PreferenceService = {
  /**
   * Returns the current user's preferences, cached per user.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The preference record.
   * @throws {NotFoundError} If the user has no preference record.
   */
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

  /**
   * Updates the current user's theme and language.
   * @param {object} data    `{ theme, language }`.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated preference record.
   * @throws {NotFoundError} If the user has no preference record.
   */
  async updatePreference(data, context) {
    validate(updatePreferenceSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    const preference = await PreferenceRepo.findByUser(user.id);

    if (!preference) throw new NotFoundError("Preference not found");

    const updated = await PreferenceRepo.update(preference.id, {
      theme: data.theme,
      language: data.language,
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
