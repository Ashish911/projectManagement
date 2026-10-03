import { cache } from "../config/cache.js";
import { createLogger } from "../config/logger.js";
import { NotificationService } from "./notification.service.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/errors.js";
import {
  ProjectRepo,
  ClientRepo,
  UserRepo,
} from "../repositories/import.repo.js";
import {
  addProjectSchema,
  idSchema,
  projectUserSchema,
  updateProjectSchema,
} from "../validation/schema.js";
import { validate } from "../validation/validate.js";

/** Business logic and role checks for projects and their assigned users. */
export const ProjectService = {
  /**
   * Lists the projects visible to the current user, scoped by role.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object[]>} The visible projects.
   * @throws {NotFoundError} If a CLIENT_ADMIN has no assigned client.
   */
  async getProjects(context) {
    const { user } = context;

    // SUPER_ADMIN sees all projects
    if (user.role === "SUPER_ADMIN") {
      return await ProjectRepo.find();
    }

    // CLIENT_ADMIN sees only their client's projects
    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findByAssignedAdmin(user.id);
      if (!client) throw new NotFoundError("No client assigned to this admin");

      return await ProjectRepo.findByClientId(client.id);
    }

    // USER sees only projects they are assigned to
    return await ProjectRepo.findByAssignedUser(user.id);
  },
  /**
   * Fetches one project if the current user may see it.
   * @param {string} id      Project ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The project.
   * @throws {ForbiddenError} If the project is outside the user's client or assignments.
   */
  async getProject(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    const project = await ProjectRepo.findById(id);

    if (!project) throw new NotFoundError("Project not found.");

    if (user.role === "SUPER_ADMIN") return project;

    // CLIENT_ADMIN — project must belong to their client
    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findByAssignedAdmin(user.id);
      if (!client) throw new NotFoundError("No client assigned to this admin");

      if (project.clientId.toString() !== client.id.toString()) {
        throw new ForbiddenError("You do not have access to this project");
      }
      return project;
    }

    // USER — check if assigned to this project
    const isAssigned = project.assignedUsers
      .map((id) => id.toString())
      .includes(user.id);

    if (!isAssigned)
      throw new ForbiddenError("You are not assigned to this project");

    return project;
  },
  /**
   * Creates a project under a client. Not allowed for USER.
   * @param {object} data    `{ name, description, [status], clientId }`.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The new project.
   * @throws {ForbiddenError} If the user is a USER or not the client's admin.
   */
  async addProject(data, context) {
    validate(addProjectSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    if (user.role === "USER")
      throw new ForbiddenError(
        "Current role does not have the permission to add Projects",
      );

    const client = await ClientRepo.findById(data.clientId);

    if (!client) throw new NotFoundError("Client not found");

    // CLIENT_ADMIN can only add projects for their own client
    if (user.role === "CLIENT_ADMIN") {
      if (client.assignedAdmin.toString() !== user.id) {
        throw new ForbiddenError("You are not the admin of this client");
      }
    }

    const project = await ProjectRepo.create({
      name: data.name,
      description: data.description,
      status: data.status || "NOT_STARTED",
      clientId: data.clientId,
    });

    logger.info(
      {
        audit: true,
        userId: user.id,
        action: "ADD_PROJECT",
      },
      "AUDIT",
    );

    return project;
  },
  /**
   * Updates a project's name, description, and status. Not allowed for USER.
   * @param {object} data    Project ID plus fields to change.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated project.
   * @throws {ForbiddenError} If the user is a USER or not the client's admin.
   */
  async updateProject(data, context) {
    validate(updateProjectSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    if (user.role === "USER") {
      throw new ForbiddenError(
        "Current role does not have the permission to update Projects",
      );
    }

    const project = await ProjectRepo.findById(data.id);

    if (!project) throw new NotFoundError("Project not found.");

    // CLIENT_ADMIN can only update their own client's projects
    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findById(project.clientId);
      if (client.assignedAdmin.toString() !== user.id) {
        throw new ForbiddenError("You are not the admin of this client");
      }
    }

    const updated = await ProjectRepo.update(data.id, {
      name: data.name,
      description: data.description,
      status: data.status,
    });

    logger.info(
      {
        audit: true,
        userId: user.id,
        action: "UPDATE_PROJECT",
      },
      "AUDIT",
    );

    return updated;
  },
  /**
   * Deletes a project. Not allowed for USER.
   * @param {string} id      Project ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The deleted project.
   * @throws {ForbiddenError} If the user is a USER or not the client's admin.
   */
  async deleteProject(id, context) {
    validate(idSchema, { id });

    const { user } = context;
    const logger = createLogger(context);

    if (user.role === "USER") {
      throw new ForbiddenError(
        "Current role does not have the permission to delete Projects",
      );
    }

    const project = await ProjectRepo.findById(id);

    if (!project) throw new NotFoundError("Project not found");

    // CLIENT_ADMIN can only delete their own client's projects
    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findById(project.clientId);
      if (client.assignedAdmin.toString() !== user.id) {
        throw new ForbiddenError("You are not the admin of this client");
      }
    }

    const deleted = await ProjectRepo.delete(id);

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetProjectId: id,
        action: "DELETE_PROJECT",
      },
      "AUDIT",
    );

    return deleted;
  },
  /**
   * Adds users to a project and notifies the newly added ones. Not allowed for USER.
   * @param {object} data    `{ id, users }` — project ID and user IDs to add.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated project.
   * @throws {NotFoundError} If any user ID does not exist.
   */
  async addUserToProject(data, context) {
    validate(projectUserSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    if (user.role === "USER") {
      throw new ForbiddenError(
        "Current role does not have the permission to add users to Projects",
      );
    }

    const project = await ProjectRepo.findById(data.id);
    if (!project) throw new NotFoundError("Project not found");

    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findById(project.clientId);
      if (client.assignedAdmin.toString() !== user.id) {
        throw new ForbiddenError("You are not the admin of this client");
      }
    }

    // Every requested user must exist
    const foundUsers = await UserRepo.findByIds(data.users);
    if (foundUsers.length !== data.users.length)
      throw new NotFoundError("One or more users not found");

    // Skip users already on the project
    const existingIds = project.assignedUsers.map((id) => id.toString());
    const newUsers = data.users.filter((id) => !existingIds.includes(id));

    const updated = await ProjectRepo.update(data.id, {
      assignedUsers: [...project.assignedUsers, ...newUsers],
    });

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetProjectId: data.id,
        action: "ADD_USER_TO_PROJECT",
      },
      "AUDIT",
    );

    await cache.invalidate(`projects:${data.id}`);

    // Notification failures are ignored so they don't fail the update
    await Promise.all(
      newUsers.map((uid) =>
        NotificationService.notify(
          uid,
          `You have been added to project "${project.name}".`,
        ).catch(() => {}),
      ),
    );

    return updated;
  },
  /**
   * Removes users from a project. Not allowed for USER.
   * @param {object} data    `{ id, users }` — project ID and user IDs to remove.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated project.
   * @throws {ConflictError} If none of the users are on the project.
   */
  async removeUserFromProject(data, context) {
    validate(projectUserSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    if (user.role === "USER") {
      throw new ForbiddenError(
        "Current role does not have the permission to remove users from Projects",
      );
    }

    const project = await ProjectRepo.findById(data.id);
    if (!project) throw new NotFoundError("Project not found");

    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findById(project.clientId);
      if (client.assignedAdmin.toString() !== user.id) {
        throw new ForbiddenError("You are not the admin of this client");
      }
    }

    // At least one requested user must currently be assigned
    const existingIds = project.assignedUsers.map((id) => id.toString());
    const hasMatch = data.users.some((id) => existingIds.includes(id));
    if (!hasMatch)
      throw new ConflictError(
        "None of the specified users are assigned to this project",
      );

    const updatedUsers = project.assignedUsers.filter(
      (id) => !data.users.includes(id.toString()),
    );

    const updated = await ProjectRepo.update(data.id, {
      assignedUsers: updatedUsers,
    });

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetProjectId: data.id,
        action: "REMOVE_USER_FROM_PROJECT",
      },
      "AUDIT",
    );

    await cache.invalidate(`projects:${data.id}`);

    return updated;
  },
};
