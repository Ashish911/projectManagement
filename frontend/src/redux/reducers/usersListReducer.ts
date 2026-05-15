import {
    USERS_LIST_REQUEST,
    USERS_LIST_SUCCESS,
    USERS_LIST_FAIL,
    USERS_LIST_REMOVE,
    USERS_LIST_PROMOTE,
} from '../constants/usersListConstants';
import type { User } from '@/types/userTypes';

interface UsersListState {
    loading: boolean;
    users: User[];
    error: string | null;
}

const initialState: UsersListState = {
    loading: false,
    users: [],
    error: null,
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
        default:
            return state;
    }
};
