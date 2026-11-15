import { ActivityRepo } from "../repositories/activity.repo.js";
import logger from "../config/logger.js";
import { visibleProjects } from "./access.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Activity / audit feed: role changes, reopens and other admin actions, with their reasons. */
export const ActivityService = {
  /**
   * Saves one entry. Never throws: a failed write must not undo the action it describes.
   * @param {object} entry `{ actor, action, summary, [reason], [targetUser], [client], [project], [task], [meta] }`.
   * @returns {Promise<object|null>} The saved entry, or null if the write failed.
   */
  async record(entry) {
    try {
      return await ActivityRepo.create(entry);
    } catch (err) {
      logger.error({ err, action: entry.action }, "Activity entry not saved");
      return null;
    }
  },

  /**
   * Newest entries the caller may see: everything for SUPER_ADMIN, their client's projects
   * plus the ones they are on for CLIENT_ADMIN, their own projects for USER.
   * @param {{ limit?: number }} args
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object[]>}
   */
  async list({ limit } = {}, context) {
    const { user } = context;
    const n = Math.min(Math.max(1, limit ?? DEFAULT_LIMIT), MAX_LIMIT);

    if (user.role === "SUPER_ADMIN") return await ActivityRepo.findRecent(n);

    const projects = await visibleProjects(user);
    if (!projects.length) return [];
    return await ActivityRepo.findByProjects(projects.map((p) => p.id), n);
  },
};
