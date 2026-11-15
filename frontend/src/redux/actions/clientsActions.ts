import {
    CLIENTS_LIST_REQUEST,
    CLIENTS_LIST_SUCCESS,
    CLIENTS_LIST_FAIL,
    CLIENTS_LIST_ADD,
    CLIENTS_LIST_UPDATE,
    CLIENTS_LIST_REMOVE,
    CLIENTS_LIST_FLAG_DELETE,
    CLIENTS_SET_FILTER,
} from '../constants/clientsConstants';
import { getClients, getMyClient } from '@/api/clientApi';
import type { Client } from '@/types/clientTypes';

/**
 * Loads every client for a super admin, or just their own for a client admin.
 * `force` refetches even when the list is cached (live refresh).
 */
export const fetchClients = (force = false) => async (dispatch: any, getState: any) => {
    const { clients } = getState().clients;
    if (!force && clients.length > 0) return; // already cached — skip the call
    try {
        dispatch({ type: CLIENTS_LIST_REQUEST });
        const own = getState().profile?.profile?.role === 'CLIENT_ADMIN';
        const data = own ? [await getMyClient()].filter(Boolean) : await getClients();
        dispatch({ type: CLIENTS_LIST_SUCCESS, payload: data });
    } catch (error: any) {
        dispatch({ type: CLIENTS_LIST_FAIL, payload: error.message });
    }
};

export const addClientToStore = (client: Client) => ({
    type: CLIENTS_LIST_ADD,
    payload: client,
});

export const updateClientInStore = (client: Client) => ({
    type: CLIENTS_LIST_UPDATE,
    payload: client,
});

export const removeClientFromStore = (id: string) => ({
    type: CLIENTS_LIST_REMOVE,
    payload: id,
});

export const flagClientDeleteRequest = (id: string) => ({
    type: CLIENTS_LIST_FLAG_DELETE,
    payload: id,
});

export const setClientsFilter = (filter: 'pending' | 'unassigned' | null) => ({
    type: CLIENTS_SET_FILTER,
    payload: filter,
});
