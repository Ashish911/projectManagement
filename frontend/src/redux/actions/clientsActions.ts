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
import { getClients } from '@/api/clientApi';
import type { Client } from '@/types/clientTypes';

export const fetchClients = () => async (dispatch: any, getState: any) => {
    const { clients } = getState().clients;
    if (clients.length > 0) return; // already cached — skip the call
    try {
        dispatch({ type: CLIENTS_LIST_REQUEST });
        const data = await getClients();
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
