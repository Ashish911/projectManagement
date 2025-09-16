import {ClientService} from "../../services/client.service.js";


export const clientResolvers = {
    Query: {
        clients: async (_, args, context) => await ClientService.getClients(context),
        client: async (_, { id }, context) => await ClientService.getClient(id, context),
    },
    Mutation: {
        addClient: async (_, args, context) => await ClientService.addClient(args, context),
        updateClient: async (_, args, context) => await ClientService.updateClient(args, context),
        confirmDeleteClient: async (_, args, context) => await ClientService.deleteClientRequest(args, context),
        deleteClientBySuperAdmin: async (_, args, context) => await ClientService.deleteClientBySuperAdmin(args, context),
    },
};