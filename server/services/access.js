// Project-level access shared by the services. A CLIENT_ADMIN runs their own client's
// projects; on any other project they are only a team member, with a USER's rights.
import { ClientRepo, ProjectRepo } from "../repositories/import.repo.js";

/**
 * The client a CLIENT_ADMIN runs, or null (other roles, or a client admin with no client).
 * @param {object} user The current user.
 * @returns {Promise<object|null>}
 */
export const ownClientOf = async (user) =>
  user.role === "CLIENT_ADMIN" ? await ClientRepo.findByAssignedAdmin(user.id) : null;

/**
 * True if the user runs this project: any SUPER_ADMIN, or the CLIENT_ADMIN of its client.
 * @param {object} project The project (needs `clientId`).
 * @param {object} user    The current user.
 * @returns {Promise<boolean>}
 */
export const managesProject = async (project, user) => {
  if (user.role === "SUPER_ADMIN") return true;
  const client = await ownClientOf(user);
  return !!client && !!project && String(client.id) === String(project.clientId);
};

/**
 * `managesProject` by project ID; loads the project only for a CLIENT_ADMIN.
 * @param {string} projectId Project ID.
 * @param {object} user      The current user.
 * @returns {Promise<boolean>}
 */
export const managesProjectId = async (projectId, user) => {
  if (user.role !== "CLIENT_ADMIN") return user.role === "SUPER_ADMIN";
  return await managesProject(await ProjectRepo.findById(projectId), user);
};

/**
 * True if the user is on the project's team.
 * @param {object} project The project.
 * @param {object} user    The current user.
 * @returns {boolean}
 */
export const onProjectTeam = (project, user) =>
  (project.assignedUsers ?? []).map(String).includes(String(user.id));

/**
 * The projects a user can see: all of a CLIENT_ADMIN's client's projects plus any
 * project they are on; just the ones they are on for a USER. Not for SUPER_ADMIN.
 * @param {object} user The current user.
 * @returns {Promise<object[]>} Unique projects.
 */
export const visibleProjects = async (user) => {
  const client = await ownClientOf(user);
  const [own, member] = await Promise.all([
    client ? ProjectRepo.findByClientId(client.id) : [],
    ProjectRepo.findByAssignedUser(user.id),
  ]);
  const byId = new Map([...own, ...member].map((p) => [String(p.id ?? p._id), p]));
  return [...byId.values()];
};
