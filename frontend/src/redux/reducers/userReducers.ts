import {
    USER_PROFILE_REQUEST,
    USER_PROFILE_SUCCESS,
    USER_PROFILE_FAIL,
    USER_UPDATE_FAIL,
    USER_UPDATE_REQUEST,
    USER_UPDATE_SUCCESS,
    USER_DELETE_FAIL,
    USER_DELETE_REQUEST,
    USER_DELETE_SUCCESS
} from "../constants/userConstants";



export const profileReducer = (state = {}, action) => {
    switch(action.type) {
        case USER_PROFILE_REQUEST:
            return {
                ...state,
                loading: true
            }
        case USER_PROFILE_SUCCESS:
            return {
                ...state,
                loading: false,
                profile: action.payload
            }
        case USER_PROFILE_FAIL:
            return {
                loading: false,
                error: action.payload
            };
        default :
            return state;
    }
}