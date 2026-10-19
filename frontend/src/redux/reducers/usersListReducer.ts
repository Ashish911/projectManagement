import {
    USERS_LIST_REQUEST,
    USERS_LIST_SUCCESS,
    USERS_LIST_FAIL,
    USERS_LIST_REMOVE,
    USERS_LIST_PROMOTE,
    USERS_LIST_SET_FILTER,
    USERS_LIST_UPSERT,
} from '../constants/usersListConstants';
import type { User } from '@/types/userTypes';

interface UsersListState {
    loading: boolean;
    users: User[];
    error: string | null;
    roleFilter: string | null;
}

const initialState: UsersListState = {
    loading: false,
    users: [],
    error: null,
    roleFilter: null,
};

export const usersListReducer = (state = initialState, action: any): UsersListState => {
    switch (action.type) {
        case USERS_LIST_REQUEST:
            return { ...state, loading: true, error: null };
        case USERS_LIST_SUCCESS:
            return { ...state, loading: false, users: action.payload };
        case USERS_LIST_FAIL:
            return { ...state, loading: false, error: action.payload };
        case USERS_LIST_REMOVE:
            return { ...state, users: state.users.filter((u) => u.id !== action.payload) };
        case USERS_LIST_PROMOTE:
            return {
                ...state,
                users: state.users.map((u) =>
                    u.id === action.payload ? { ...u, role: 'CLIENT_ADMIN' } : u
                ),
            };
        // Adds new users and replaces existing ones (create, edit, role change, unlock)
        case USERS_LIST_UPSERT: {
            const incoming: User[] = action.payload;
            const byId = new Map(incoming.map((u) => [u.id, u]));
            const kept = state.users.map((u) => (byId.has(u.id) ? { ...u, ...byId.get(u.id)! } : u));
            const added = incoming.filter((u) => !state.users.some((x) => x.id === u.id));
            return { ...state, users: [...kept, ...added] };
        }
        case USERS_LIST_SET_FILTER:
            return { ...state, roleFilter: action.payload };
        default:
            return state;
    }
};
