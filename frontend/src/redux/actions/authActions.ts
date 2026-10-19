import {
    LOGOUT,
} from "../constants/authConstants";
import { closeSocket } from "@/api/ws";

export const logout = () => async (dispatch) => {
    try {
        localStorage.removeItem('token');
        closeSocket(); // The next user connects with their own token
        dispatch({
            type: LOGOUT
        });

    } catch (error) {
        console.log(error);
    }
}
