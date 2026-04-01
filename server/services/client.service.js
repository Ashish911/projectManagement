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

    return await ClientRepo.find();
  },
  async getClient(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    const client = await ClientRepo.findById(id);

    if (!client) throw new Error("Client not found");

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

    const { user } = context;

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

    return client;
  },
  async deleteClientRequest(id, context) {
    console.log("deleteClientRequest called with id:", id);
    validate(idSchema, { id });

    const { user } = context;

    // Only the Client admin itself can delete client_admin
    if (user.role == "CLIENT_ADMIN") {
      return await ClientRepo.update(id, { set: { deleteRequest: true } });
    } else {
      throw new ForbiddenError(
        "Current role does not have the permission to request client deletion.",
      );
    }
  },
  async deleteClientBySuperAdmin(id, context) {
    validate(idSchema, { id });

    const { user } = context;

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

    return await ClientRepo.delete(id);
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

    return await ClientRepo.delete(id);
  },
  async updateClient(data, context) {
    validate(updateClientSchema, data);

    const { user } = context;

    if (user.role == "USER") {
      throw new ForbiddenError(
        "Current role does not have the permission to update Clients",
      );
    }

    const client = await ClientRepo.findById(data.id);

    if (!client) throw new NotFoundError("Client not found");

    if (user.id == client.assignedAdmin || user.role == "SUPER_ADMIN") {
      return await ClientRepo.update(data.id, data);
    }

    throw new ConflictError("Client error");
  },
};
