import {
    USERS_LIST_REQUEST,
    USERS_LIST_SUCCESS,
    USERS_LIST_FAIL,
    USERS_LIST_REMOVE,
    USERS_LIST_PROMOTE,
} from '../constants/usersListConstants';
import { getUsers } from '@/api/userApi';

export const fetchUsers = () => async (dispatch: any, getState: any) => {
    const { users } = getState().usersList;
    if (users.length > 0) return; // already cached — skip the call
    try {
        dispatch({ type: USERS_LIST_REQUEST });
        const data = await getUsers();
        dispatch({ type: USERS_LIST_SUCCESS, payload: data });
    } catch (error: any) {
        dispatch({ type: USERS_LIST_FAIL, payload: error.message });
    }
};

export const removeUserFromStore = (id: string) => ({
    type: USERS_LIST_REMOVE,
    payload: id,
});

export const promoteUserInStore = (id: string) => ({
    type: USERS_LIST_PROMOTE,
    payload: id,
});
