import {ClientRepo, UserRepo} from "../repositories/import.repo.js";
import {Error} from "mongoose";
import Client from "../models/Client.js";

export const ClientService = {
    async getClients(context){

        const { user } = context;

        if (user.role != "SUPER_ADMIN") {
            throw new Error("Current role does not have the permission to get Clients");
        }

        return await ClientRepo.find();
    },
    async getClient(id, context) {

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
                throw new Error("You are not assigned to this client");
            }

            return client;
        }

        throw new Error("Current role does not have the permission to get Clients")
    },
    async addClient(data, context){

        const { user } = context;

        // SUPER_ADMIN can access everything
        if (user.role !== "SUPER_ADMIN") {
            throw new Error("Current role does not have the permission to add Clients");
        }

        const clientEmail = await ClientRepo.findByEmail(data.email);

        if (clientEmail) throw new Error("Client with this email already exists");

        const clientUser = await UserRepo.findById(data.user.id);

        if (!clientUser) throw new Error("User not found");

        if (clientUser.role != "CLIENT_ADMIN") throw new Error("Current role does not have the permission to become admin for this client.");

        const usedUser = await ClientRepo.findByUser(clientUser.id);

        if (usedUser) throw new Error("User is already assigned to a client");

        const client = await ClientRepo.create({
            ...data
        });

        return client;
    },
    async deleteClientRequest(data, context) {

        const { user } = context;

        // SUPER_ADMIN can access everything
        if (user.role !== "SUPER_ADMIN" || user.role !== "USER") {
            throw new Error("Current role does not have the permission to add Clients");
        }

        const newClient = await ClientRepo.update(data.id, {set: {deleteRequest: true}});

        return newClient;

    },
    async deleteClientBySuperAdmin(data, context) {

        const { user } = context;

        // SUPER_ADMIN can access everything
        if (user.role !== "SUPER_ADMIN") {
            throw new Error("Current role does not have the permission to add Clients");
        }

        const client = await ClientRepo.findById(data.id);

        if (!client) throw new Error("Client not found");

        const deletedClient = await ClientRepo.delete(data.id);

        return deletedClient;
    },
    async updateClient(data, context) {
        const { user } = context;

        // SUPER_ADMIN can access everything
        if (user.role == "USER") {
            throw new Error("Current role does not have the permission to update Clients");
        }

        const client = await ClientRepo.findById(data.id);

        if (!client) throw new Error("Client not found");

        if (user.id == client.assignedUser.id || user.role == "SUPER_ADMIN") {

            const updatedClient = await ClientRepo.update(data.id, data);

            return updatedClient;

        }

        throw new Error("Client error");
    }

}