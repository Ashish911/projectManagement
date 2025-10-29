import {
    LOGOUT,
} from "../constants/authConstants";

export const logout = () => async (dispatch) => {
    try {
        localStorage.removeItem('token');
        dispatch({
            type: LOGOUT
        });

    } catch (error) {
        console.log(error);
    }
}