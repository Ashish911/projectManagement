import {ClientService} from "../../services/client.service.js";


export const clientResolvers = {
    Query: {
        clients: async () => await ClientService.getClients(),
        client: async (_, { id }) => await ClientService.getClient(id)
    },
    Mutation: {
        addClient: async (_, args) => await ClientService.addClient(input),
        // updateClient
        // deleteClient
    },
};