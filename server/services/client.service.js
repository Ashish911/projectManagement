import { ClientRepo } from "../repositories/import.repo.js";

export const ClientService = {
    async getClients(){
        return ClientRepo.find();
    },
    async getClient(id) {
        const client = await ClientRepo.findById(id);
        if (!client) throw new Error("Client not found");
        return client;
    },
    async addClient(client){

    }
}