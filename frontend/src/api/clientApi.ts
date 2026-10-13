import { GET_CLIENT, GET_CLIENTS } from "@/queries/clientQueries.ts";
import {
    ADD_CLIENT,
    UPDATE_CLIENT,
    CONFIRM_DELETE_CLIENT,
    DELETE_CLIENT_BY_SUPER_ADMIN,
    FORCE_DELETE_CLIENT,
    ASSIGN_ADMIN,
    DECLINE_CLIENT_DELETION,
} from "@/mutations/clientMutations.ts";
import type { Client } from "@/types/clientTypes.ts";
import { gql } from "@/api/graphql";

export const getClients = async (): Promise<Client[]> =>
    (await gql<{ clients: Client[] }>(GET_CLIENTS)).clients;

/** One client by id. CLIENT_ADMINs may only read the client they're assigned to. */
export const getClient = async (id: string): Promise<Client> =>
    (await gql<{ client: Client }>(GET_CLIENT, { id })).client;

export const addClient = async (vars: { name: string; email?: string | null; phone?: string | null; assignedAdmin?: string }): Promise<Client> =>
    (await gql<{ addClient: Client }>(ADD_CLIENT, vars)).addClient;

export const updateClient = async (vars: { id: string; name: string; email?: string | null; phone?: string | null; assignedAdmin?: string }): Promise<Client> =>
    (await gql<{ updateClient: Client }>(UPDATE_CLIENT, vars)).updateClient;

export const confirmDeleteClient = async (id: string): Promise<void> => {
    await gql(CONFIRM_DELETE_CLIENT, { id });
};

export const deleteClientBySuperAdmin = async (id: string): Promise<void> => {
    await gql(DELETE_CLIENT_BY_SUPER_ADMIN, { id });
};

export const forceDeleteClient = async (id: string): Promise<void> => {
    await gql(FORCE_DELETE_CLIENT, { id });
};

export const assignAdmin = async (vars: { id: string; assignedAdmin: string }): Promise<Client> =>
    (await gql<{ assignAdmin: Client }>(ASSIGN_ADMIN, vars)).assignAdmin;

/** SUPER_ADMIN rejects a deletion request; the client admin is notified with the message. */
export const declineClientDeletion = async (id: string, message?: string): Promise<Client> =>
    (await gql<{ declineClientDeletion: Client }>(DECLINE_CLIENT_DELETION, { id, message: message || null })).declineClientDeletion;
