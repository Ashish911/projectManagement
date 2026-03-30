import { validate } from "graphql";
import { ForbiddenError, NotFoundError } from "../errors/errors.js";
import { ProjectRepo } from "../repositories/import.repo.js";
import { ClientRepo } from "../repositories/import.repo.js";
import { addProjectSchema, updateProjectSchema } from "../validation/schema.js";

export const ProjectService = {
  async getProjects(context) {
    const { user } = context;

    // SUPER_ADMIN sees all projects
    if (user.role === "SUPER_ADMIN") {
      return await ProjectRepo.find();
    }

    // CLIENT_ADMIN sees only their client's projects
    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findByUser(user.id);
      if (!client) throw new NotFoundError("No client assigned to this admin");

      return await ProjectRepo.findByClient(client._id);
    }

    // USER sees only projects they are assigned to
    return await ProjectRepo.findByAssignedUser(user.id);
  },
  async getProject(id, context) {
    const { user } = context;

    const project = await ProjectRepo.findById(id);

    if (!project) throw new NotFoundError("Project not found.");

    if (user.role === "SUPER_ADMIN") return project;

    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findByUser(user.id);
      if (!client) throw new NotFoundError("No client assigned to this admin");

      if (project.clientId.toString() !== client._id.toString()) {
        throw new ForbiddenError("You do not have access to this project");
      }
      return project;
    }

    // USER — check if assigned to this project
    const isAssigned = project.assignedUser
      .map((id) => id.toString())
      .includes(user.id);

    if (!isAssigned)
      throw new ForbiddenError("You are not assigned to this project");

    return project;
  },
  async addProject(data, context) {
    validate(addProjectSchema, data);

    const { user } = context;

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

    return await ProjectRepo.create({
      name: data.name,
      description: data.description,
      status: data.status || "NOT_STARTED",
      clientId: data.clientId,
    });
  },
  async updateProject(data, context) {
    validate(updateProjectSchema, data);
    const { user } = context;

    if (user.role === "USER") {
      throw new ForbiddenError(
        "Current role does not have the permission to update Projects",
      );
    }

    const project = await ProjectRepo.findById(data.id);

    if (!project) throw new NotFoundError("Project not found.");

    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findById(project.clientId);
      if (client.assignedAdmin.toString() !== user.id) {
        throw new ForbiddenError("You are not the admin of this client");
      }
    }

    return await ProjectRepo.update(data.id, {
      name: data.name,
      description: data.description,
      status: data.status,
    });
  },
  async deleteProject(id, context) {
    const { user } = context;

    if (user.role === "USER") {
      throw new ForbiddenError(
        "Current role does not have the permission to delete Projects",
      );
    }

    const project = await ProjectRepo.findById(id);

    if (!project) throw new NotFoundError("Project not found");

    if (user.role === "CLIENT_ADMIN") {
      const client = await ClientRepo.findById(project.clientId);
      if (client.assignedAdmin.toString() !== user.id) {
        throw new ForbiddenError("You are not the admin of this client");
      }
    }

    return await ProjectRepo.delete(id);
  },
  async addUserToProject(data, context) {
    const { user } = context;

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

    // Only add users not already in the project
    const newUsers = data.users.filter(
      (userId) =>
        !project.assignedUser.map((id) => id.toString()).includes(userId),
    );

    return await ProjectRepo.update(data.id, {
      assignedUser: [...project.assignedUser, ...newUsers],
    });
  },
  async removeUserFromProject(data, context) {
    const { user } = context;

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

    const updatedUsers = project.assignedUser.filter(
      (userId) => !data.users.includes(userId.toString()),
    );

    return await ProjectRepo.update(data.id, { assignedUser: updatedUsers });
  },
};
