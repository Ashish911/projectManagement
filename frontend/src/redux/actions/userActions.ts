import {USER_PROFILE_FAIL, USER_PROFILE_REQUEST, USER_PROFILE_SUCCESS} from "@/redux/constants/userConstants.ts";
import {getProfile} from "@/api/userApi.ts";


export const fetchProfile = () => async (dispatch) => {
    try {
        dispatch({
            type: USER_PROFILE_REQUEST
        });

        const response = await getProfile()

        console.log(response);

        dispatch({
            type: USER_PROFILE_SUCCESS,
            payload: response.profile
        });

    } catch (error) {
        dispatch({
            type: USER_PROFILE_FAIL,
            payload:
                error.response && error.response.data.message
                    ? error.response.data.message
                    : error.message
        });
    }
};