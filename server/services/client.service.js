import { cache } from "../config/cache.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../errors/errors.js";
import { ClientRepo, UserRepo } from "../repositories/import.repo.js";
import { NotificationService } from "./notification.service.js";
import { ActivityService } from "./activity.service.js";
import {
  addClientSchema,
  assignAdminSchema,
  declineClientDeletionSchema,
  deleteClientAdminPlanSchema,
  idSchema,
  updateClientSchema,
} from "../validation/schema.js";
import { validate } from "../validation/validate.js";
import { createLogger } from "../config/logger.js";

/**
 * The id of a client's admin as a string, whatever shape `assignedAdmin` has: a raw ObjectId
 * (from the repo, whose `.id` is a Buffer), a plain string (from the cache) or a populated `{ id }`.
 * @param {object|string|null|undefined} admin The client's `assignedAdmin`.
 * @returns {string|null}
 */
const adminIdOf = (admin) =>
  typeof admin?.id === "string" ? admin.id : (admin?.toString() ?? null);

/** Business logic and role checks for clients. */
/**
 * Before a client is deleted: its client admin must not be left without a client, so the
 * super admin either reassigns them to a client with no admin or demotes them to USER.
 * Checks everything before changing anything.
 * @param {object} client  The client about to be deleted.
 * @param {{ adminAction?: "REASSIGN"|"DEMOTE", reassignTo?: string, reason?: string }} plan
 * @param {object} user    The super admin.
 * @param {object} logger  Request logger.
 * @throws {ValidationError|NotFoundError|ConflictError} If the plan is missing or can't be applied.
 */
const settleAdminBeforeDelete = async (client, plan = {}, user, logger) => {
  const admin = adminIdOf(client.assignedAdmin);
  if (!admin) return;
  const { adminAction, reassignTo, reason } = validate(deleteClientAdminPlanSchema, plan);
  if (!adminAction) throw new ValidationError("Choose what happens to the client admin: reassign them or make them a User");
  if (!reason) throw new ValidationError("Give a reason for this change");

  if (adminAction === "REASSIGN") {
    const target = await ClientRepo.findById(reassignTo);
    if (!target) throw new NotFoundError("Client not found");
    if (String(target.id ?? target._id) === String(client.id ?? client._id)) throw new ValidationError("Pick a different client");
    if (adminIdOf(target.assignedAdmin)) throw new ConflictError(`${target.name} already has a client admin`);
    await ClientRepo.update(reassignTo, { assignedAdmin: admin });
    await ActivityService.record({
      actor: user.id, action: "ADMIN_REASSIGNED", targetUser: admin, client: reassignTo, reason,
      summary: `moved the client admin of ${client.name} to ${target.name} before deleting ${client.name}`,
    });
    await NotificationService.notify(admin, `${client.name} was deleted. You are now the admin for client "${target.name}".`).catch(() => {});
  } else {
    await UserRepo.update(admin, { role: "USER" });
    await ActivityService.record({
      actor: user.id, action: "ROLE_CHANGED", targetUser: admin, client: client.id ?? client._id, reason,
      summary: `changed the client admin of ${client.name} to User before deleting ${client.name}`,
      meta: { oldRole: "CLIENT_ADMIN", newRole: "USER" },
    });
    await NotificationService.notify(admin, `${client.name} was deleted, so your role is now User.`).catch(() => {});
  }
  logger.info({ audit: true, userId: user.id, targetUserId: admin, targetClientId: client.id ?? client._id, adminAction, reason, action: "CLIENT_ADMIN_SETTLED" }, "AUDIT");
  await cache.invalidate("users:all");
  await cache.invalidate(`users:${admin}`);
};

export const ClientService = {
  /**
   * The client the caller administers. Lets a CLIENT_ADMIN see their client even
   * before it has any projects; access comes from client ownership.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object|null>} Their client, or null (no client, or not a client admin).
   */
  async getMyClient(context) {
    const { user } = context;
    if (user.role !== "CLIENT_ADMIN") return null;
    return (await ClientRepo.findByAssignedAdmin(user.id)) ?? null;
  },

  /**
   * Lists all clients. SUPER_ADMIN only.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object[]>} All clients.
   * @throws {ForbiddenError} If the user is not a SUPER_ADMIN.
   */
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
  /**
   * Fetches one client. SUPER_ADMIN sees any client; CLIENT_ADMIN only the one assigned to them.
   * @param {string} id      Client ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The client.
   * @throws {ForbiddenError} If the user may not view this client.
   */
  async getClient(id, context) {
    validate(idSchema, { id });

    const { user } = context;

    const cacheKey = `clients:${id}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      // Still enforce access control on cached data
      if (user.role === "SUPER_ADMIN") return cached;
      if (user.role === "CLIENT_ADMIN") {
        if (adminIdOf(cached.assignedAdmin) !== user.id)
          throw new ForbiddenError("You are not assigned to this client");
        return cached;
      }
      throw new ForbiddenError("...");
    }

    const client = await ClientRepo.findById(id);

    if (!client) throw new Error("Client not found");

    // Cached before the role check, so the cached path above must repeat it.
    await cache.set(cacheKey, client);

    // SUPER_ADMIN can access everything
    if (user.role === "SUPER_ADMIN") {
      return client;
    }

    if (user.role === "CLIENT_ADMIN") {
      const isAssigned = adminIdOf(client.assignedAdmin) === user.id;

      if (!isAssigned) {
        throw new ForbiddenError("You are not assigned to this client");
      }

      return client;
    }

    throw new ForbiddenError(
      "Current role does not have the permission to get Client",
    );
  },
  /**
   * Creates a client, optionally with a CLIENT_ADMIN attached. SUPER_ADMIN only.
   * @param {object} data    Client fields (name, email, optional assignedAdmin).
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The new client.
   * @throws {ForbiddenError} If the user is not a SUPER_ADMIN or the admin lacks CLIENT_ADMIN role.
   * @throws {ConflictError}  If the email is taken or the admin already has a client.
   */
  async addClient(data, context) {
    validate(addClientSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    // Only SUPER_ADMIN can add clients
    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Current role does not have the permission to add Clients",
      );
    }

    // Email is optional; only check uniqueness when one is given
    if (data.email) {
      const existingClient = await ClientRepo.findByEmail(data.email);
      if (existingClient)
        throw new ConflictError("Client with this email already exists");
    }

    // If an admin is supplied, it must be an unassigned CLIENT_ADMIN
    if (data.assignedAdmin != null) {
      const clientUser = await UserRepo.findById(data.assignedAdmin);

      if (clientUser) {
        if (clientUser.role != "CLIENT_ADMIN")
          throw new ForbiddenError(
            "Current role does not have the permission to become admin for this client.",
          );

        const user = await ClientRepo.findByAssignedAdmin(clientUser.id);

        if (user)
          throw new ConflictError("User is already assigned to a client.");
      } else {
        throw new NotFoundError("User not found");
      }
    }

    const client = await ClientRepo.create({
      ...data,
      // Optional contact fields: store nothing rather than an empty string
      email: data.email || undefined,
      phone: data.phone || undefined,
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
  /**
   * Flags a client for deletion; a SUPER_ADMIN then confirms it. CLIENT_ADMIN only.
   * @param {string} id      Client ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The client with `deleteRequest` set.
   * @throws {ForbiddenError} If the user is not a CLIENT_ADMIN.
   */
  async deleteClientRequest(id, context) {
    validate(idSchema, { id });

    const { user } = context;
    const logger = createLogger(context);

    // Only a CLIENT_ADMIN can request deletion, and only of their own client
    if (user.role == "CLIENT_ADMIN") {
      const client = await ClientRepo.findById(id);
      if (!client) throw new NotFoundError("Client not found");
      if (client.assignedAdmin?.toString() !== user.id)
        throw new ForbiddenError("You are not assigned to this client");

      const updatedClient = await ClientRepo.update(id, { deleteRequest: true });

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
  /**
   * Deletes a client that has a pending delete request. SUPER_ADMIN only.
   * @param {string} id      Client ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The deleted client.
   * @throws {ConflictError} If the client has not requested deletion.
   */
  async deleteClientBySuperAdmin(id, context, adminPlan) {
    validate(idSchema, { id });

    const { user } = context;
    const logger = createLogger(context);

    // Only SUPER_ADMIN can delete clients
    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Current role does not have the permission to delete Clients.",
      );
    }

    const client = await ClientRepo.findById(id);
    if (!client) throw new NotFoundError("Client not found");

    if (!client.deleteRequest)
      throw new ConflictError("Delete request not found for this client.");

    await settleAdminBeforeDelete(client, adminPlan, user, logger);
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

  /**
   * Deletes a client without a prior delete request. SUPER_ADMIN only.
   * @param {string} id      Client ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The deleted client.
   */
  async forceDeleteClientBySuperAdmin(id, context, adminPlan) {
    validate(idSchema, { id });

    const { user } = context;
    const logger = createLogger(context);

    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Current role does not have the permission to delete Clients.",
      );
    }

    const client = await ClientRepo.findById(id);
    if (!client) throw new NotFoundError("Client not found");

    await settleAdminBeforeDelete(client, adminPlan, user, logger);
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
  /**
   * Assigns a CLIENT_ADMIN to a client and notifies them. SUPER_ADMIN only.
   * @param {object} data    `{ id, assignedAdmin }` — client ID and user ID.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated client.
   * @throws {ConflictError} If the user already administers a different client.
   */
  /**
   * Rejects a client admin's deletion request and tells them why. SUPER_ADMIN only.
   * @param {object} data    `{ id, [message] }`.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The client with `deleteRequest` cleared.
   * @throws {ConflictError} If the client has no pending request.
   */
  async declineClientDeletion(data, context) {
    const { id, message } = validate(declineClientDeletionSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Current role does not have the permission to decline deletion requests.",
      );
    }

    const client = await ClientRepo.findById(id);
    if (!client) throw new NotFoundError("Client not found");
    if (!client.deleteRequest)
      throw new ConflictError("Delete request not found for this client.");

    const updated = await ClientRepo.update(id, { deleteRequest: false });

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetClientId: id,
        action: "CLIENT_DELETE_DECLINED",
      },
      "AUDIT",
    );

    await cache.invalidate(`clients:${id}`);
    await cache.invalidate("clients:all");

    // A failed notification should not undo the decision
    if (client.assignedAdmin) {
      const note = message?.trim() ? ` Message: ${message.trim()}` : "";
      await NotificationService.notify(
        client.assignedAdmin,
        `Your request to delete "${client.name}" was declined.${note}`,
      ).catch(() => {});
    }

    return updated;
  },
  async assignAdmin(data, context) {
    validate(assignAdminSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    if (user.role !== "SUPER_ADMIN") {
      throw new ForbiddenError(
        "Current role does not have the permission to assign admin to Clients",
      );
    }

    const client = await ClientRepo.findById(data.id);
    if (!client) throw new NotFoundError("Client not found");

    const adminUser = await UserRepo.findById(data.assignedAdmin);
    if (!adminUser) throw new NotFoundError("User not found");

    if (adminUser.role !== "CLIENT_ADMIN") {
      throw new ForbiddenError("User does not have CLIENT_ADMIN role");
    }

    // An admin may manage only one client; re-assigning to the same client is allowed
    const alreadyAssigned = await ClientRepo.findByAssignedAdmin(data.assignedAdmin);
    if (alreadyAssigned && alreadyAssigned.id !== data.id)
      throw new ConflictError("User is already assigned to a different client");

    const updated = await ClientRepo.update(data.id, { assignedAdmin: data.assignedAdmin });

    // A client admin must have a client: the admin being replaced goes back to USER
    const previousAdmin = adminIdOf(client.assignedAdmin);
    if (previousAdmin && previousAdmin !== data.assignedAdmin) {
      await UserRepo.update(previousAdmin, { role: "USER" });
      logger.info(
        { audit: true, userId: user.id, targetUserId: previousAdmin, targetClientId: data.id, action: "CLIENT_ADMIN_REPLACED", oldRole: "CLIENT_ADMIN", newRole: "USER" },
        "AUDIT",
      );
      await cache.invalidate("users:all");
      await cache.invalidate(`users:${previousAdmin}`);
      await NotificationService.notify(
        previousAdmin,
        `You are no longer the admin for client "${client.name}", so your role is now User.`,
      ).catch(() => {});
    }

    logger.info(
      {
        audit: true,
        userId: user.id,
        targetClientId: data.id,
        action: "CLIENT_ADMIN_ASSIGNED",
      },
      "AUDIT",
    );

    await cache.invalidate(`clients:${data.id}`);
    await cache.invalidate("clients:all");

    // A failed notification should not fail the assignment
    await NotificationService.notify(
      data.assignedAdmin,
      `You have been assigned as admin for client "${client.name}".`,
    ).catch(() => {});

    return updated;
  },
  /**
   * Updates a client. Allowed for SUPER_ADMIN or the client's assigned admin.
   * @param {object} data    Client ID plus fields to change.
   * @param {object} context GraphQL context with the current `user`.
   * @returns {Promise<object>} The updated client.
   * @throws {ForbiddenError} If the user is a USER.
   * @throws {ConflictError}  If a CLIENT_ADMIN is not assigned to this client.
   */
  async updateClient(data, context) {
    validate(updateClientSchema, data);

    const { user } = context;
    const logger = createLogger(context);

    if (user.role == "USER") {
      throw new ForbiddenError(
        "Current role does not have the permission to update Clients",
      );
    }

    const client = await ClientRepo.findById(data.id);

    if (!client) throw new NotFoundError("Client not found");

    // Loose equality: assignedAdmin is an ObjectId, user.id a string
    if (user.id == client.assignedAdmin || user.role == "SUPER_ADMIN") {
      const updated = await ClientRepo.update(data.id, data);

      logger.info(
        {
          audit: true,
          userId: user.id,
          targetClientId: data.id,
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
