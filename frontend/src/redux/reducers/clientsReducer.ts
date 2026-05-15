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
import type { Client } from '@/types/clientTypes';

interface ClientsState {
    loading: boolean;
    clients: Client[];
    error: string | null;
    activeFilter: 'pending' | 'unassigned' | null;
}

const initialState: ClientsState = {
    loading: false,
    clients: [],
    error: null,
    activeFilter: null,
};

export const clientsReducer = (state = initialState, action: any): ClientsState => {
    switch (action.type) {
        case CLIENTS_LIST_REQUEST:
            return { ...state, loading: true, error: null };
        case CLIENTS_LIST_SUCCESS:
            return { ...state, loading: false, clients: action.payload };
        case CLIENTS_LIST_FAIL:
            return { ...state, loading: false, error: action.payload };
        case CLIENTS_LIST_ADD:
            return { ...state, clients: [...state.clients, action.payload] };
        case CLIENTS_LIST_UPDATE:
            return {
                ...state,
                clients: state.clients.map((c) =>
                    c.id === action.payload.id ? action.payload : c
                ),
            };
        case CLIENTS_LIST_REMOVE:
            return { ...state, clients: state.clients.filter((c) => c.id !== action.payload) };
        case CLIENTS_LIST_FLAG_DELETE:
            return {
                ...state,
                clients: state.clients.map((c) =>
                    c.id === action.payload ? { ...c, deleteRequest: true } : c
                ),
            };
        case CLIENTS_SET_FILTER:
            return { ...state, activeFilter: action.payload };
        default:
            return state;
    }
};
