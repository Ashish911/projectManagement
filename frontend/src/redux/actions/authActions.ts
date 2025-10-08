import { LOGIN_REQUEST,
    LOGIN_SUCCESS,
    LOGIN_FAIL,
} from "../constants/authConstants";
import {useMutation} from "react-query";
import {loginUser} from "@/api/authApi.ts";

const { mutateAsync: loginUserMutation } = useMutation({
    mutationFn: loginUser,
});

type authParams = {
    email: string;
    password: string;
}

export const login = (email, password) => async (dispatch) => {
    try {
        dispatch({
            type: LOGIN_REQUEST
        });

        const response = await loginUserMutation({
          email: email,
          password: passwo rd,
        });

        console.log(response.login.token);

        dispatch({
            type: LOGIN_SUCCESS,
            payload: response.login.token
        });

        localStorage.setItem('userInfo', JSON.stringify(response.login.token));
    } catch (error) {
        dispatch({
            type: LOGIN_FAIL,
            payload:
                error.response && error.response.data.message
                    ? error.response.data.message
                    : error.message
        });
    }
};