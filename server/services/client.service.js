import { cache } from "../config/cache.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/errors.js";
import { ClientRepo, UserRepo } from "../repositories/import.repo.js";
import {
  addClientSchema,
  idSchema,
  updateClientSchema,
} from "../validation/schema.js";
import { validate } from "../validation/validate.js";

export const ClientService = {
  async getClients(context) {
    const { user } = context;

    if (user.role != "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Current role does not have the permission to get Clients",
      );
    }

    const cacheKey = "clients:all";
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    const clients = await ClientRepo.find();
    await cache.set(cacheKey, clients);
    return clients;
  },
  async getClient(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    const cacheKey = `clients:${id}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      // Still enforce access control on cached data
      if (user.role === "SUPER_ADMIN") return cached;
      if (user.role === "CLIENT_ADMIN") {
        if (cached.assignedAdmin?.id != user.id)
          throw new ForbiddenError("You are not assigned to this client");
        return cached;
      }
      throw new ForbiddenError("...");
    }

    const client = await ClientRepo.findById(id);

    if (!client) throw new Error("Client not found");

    await cache.set(cacheKey, client);

    // SUPER_ADMIN can access everything
    if (user.role === "SUPER_ADMIN") {
      return client;
    }

    if (user.role === "CLIENT_ADMIN") {
      // Assuming client.admins is an array of assigned client admins
      const isAssigned = client.assignedAdmin?.id == user.id;

      if (!isAssigned) {
        throw new ForbiddenError("You are not assigned to this client");
      }

      return client;
    }

    throw new ForbiddenError(
      "Current role does not have the permission to get Client",
    );
  },
  async addClient(data, context) {
    validate(addClientSchema, data);

    const { user, logger } = context;

    // SUPER_ADMIN can access everything
    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Current role does not have the permission to add Clients",
      );
    }

    const existingClient = await ClientRepo.findByEmail(data.email);

    if (existingClient)
      throw new ConflictError("Client with this email already exists");

    if (data.assignedAdmin != null) {
      const clientUser = await UserRepo.findById(data.user?.id);

      if (clientUser) {
        if (clientUser.role != "CLIENT_ADMIN")
          throw new ForbiddenError(
            "Current role does not have the permission to become admin for this client.",
          );

        const user = await ClientRepo.findByUser(clientUser.id);

        if (user)
          throw new ConflictError("User is already assigned to a client.");
      } else {
        throw new NotFoundError("User not found");
      }
    }

    const client = await ClientRepo.create({
      ...data,
    });

    logger.info(
      {
        audit: true,
        userId: user.id,
        action: "CLIENT_CREATED",
      },
      "AUDIT",
    );

    await cache.invalidate("clients:all");

    return client;
  },
  async deleteClientRequest(id, context) {
    console.log("deleteClientRequest called with id:", id);
    validate(idSchema, { id });

    const { user, logger } = context;

    // Only the Client admin itself can delete client_admin
    if (user.role == "CLIENT_ADMIN") {
      const updatedClient = await ClientRepo.update(id, {
        set: { deleteRequest: true },
      });

      logger.info(
        {
          audit: true,
          userId: user.id,
          action: "CLIENT_DELETE_REQUESTED",
        },
        "AUDIT",
      );

      await cache.invalidate(`clients:${id}`);
      await cache.invalidate("clients:all");

      return updatedClient;
    } else {
      throw new ForbiddenError(
        "Current role does not have the permission to request client deletion.",
      );
    }
  },
  async deleteClientBySuperAdmin(id, context) {
    validate(idSchema, { id });

    const { user, logger } = context;

    // SUPER_ADMIN can access everything
    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Current role does not have the permission to delete Clients.",
      );
    }

    const client = await ClientRepo.findById(id);
    if (!client) throw new NotFoundError("Client not found");

    if (!client.deleteRequest)
      throw new ConflictError("Delete request not found for this client.");

    const deleted = await ClientRepo.delete(id);

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetClientId: id,
        action: "CLIENT_DELETED",
      },
      "AUDIT",
    );

    await cache.invalidate(`clients:${id}`);
    await cache.invalidate("clients:all");

    return deleted;
  },

  async forceDeleteClientBySuperAdmin(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Current role does not have the permission to delete Clients.",
      );
    }

    const client = await ClientRepo.findById(id);
    if (!client) throw new NotFoundError("Client not found");

    const deleted = await ClientRepo.delete(id);

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetClientId: id,
        action: "FORCE_CLIENT_DELETED",
      },
      "AUDIT",
    );

    await cache.invalidate(`clients:${id}`);
    await cache.invalidate("clients:all");

    return deleted;
  },
  async updateClient(data, context) {
    validate(updateClientSchema, data);

    const { user, logger } = context;

    if (user.role == "USER") {
      throw new ForbiddenError(
        "Current role does not have the permission to update Clients",
      );
    }

    const client = await ClientRepo.findById(data.id);

    if (!client) throw new NotFoundError("Client not found");

    if (user.id == client.assignedAdmin || user.role == "SUPER_ADMIN") {
      const updated = await ClientRepo.update(data.id, data);

      logger.info(
        {
          audit: true,
          userId: user.id,
          targetClientId: id,
          action: "CLIENT_UPDATED",
        },
        "AUDIT",
      );

      await cache.invalidate(`clients:${data.id}`);
      await cache.invalidate("clients:all");

      return updated;
    }

    throw new ConflictError("Client error");
  },
};
