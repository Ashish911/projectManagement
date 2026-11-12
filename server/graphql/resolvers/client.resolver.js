import { ClientService } from "../../services/client.service.js";

export const clientResolvers = {
  Query: {
    clients: async (_, args, context) =>
      await ClientService.getClients(context),
    client: async (_, { id }, context) =>
      await ClientService.getClient(id, context),
  },
  Mutation: {
    addClient: async (_, args, context) =>
      await ClientService.addClient(args, context),
    updateClient: async (_, args, context) =>
      await ClientService.updateClient(args, context),
    confirmDeleteClient: async (_, { id }, context) =>
      await ClientService.deleteClientRequest(id, context),
    deleteClientBySuperAdmin: async (_, { id, ...adminPlan }, context) =>
      await ClientService.deleteClientBySuperAdmin(id, context, adminPlan),
    declineClientDeletion: async (_, args, context) =>
      await ClientService.declineClientDeletion(args, context),

    forceDeleteClient: async (_, { id, ...adminPlan }, context) =>
      await ClientService.forceDeleteClientBySuperAdmin(id, context, adminPlan),
    assignAdmin: async (_, args, context) =>
      await ClientService.assignAdmin(args, context),
  },
};
