import { LOGIN_REQUEST,
    LOGIN_SUCCESS,
    LOGIN_FAIL,
    LOGOUT,
    REGISTER_REQUEST,
    REGISTER_SUCCESS,
    REGISTER_FAIL,
    REGISTER_RESET
    // RESET_PASSWORD_REQUEST,
    // RESET_PASSWORD_SUCCESS,
    // RESET_PASSWORD_FAIL,
    // FORGOT_PASSWORD_REQUEST,
    // FORGOT_PASSWORD_SUCCESS,
    // FORGOT_PASSWORD_FAIL,
    // CHANGE_PASSWORD_REQUEST,
    // CHANGE_PASSWORD_SUCCESS,
    // CHANGE_PASSWORD_FAIL,
} from "../constants/authConstants";

export const authLoginReducer = (state = {}, action) => {
    switch(action.type) {
        case LOGIN_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            }
        case LOGIN_SUCCESS:
            return {
                ...state,
                loading: false,
                token: action.payload
            }
        case LOGIN_FAIL:
            return {
                loading: false,
                error: action.payload
            }
        case LOGOUT:
            return {
                loading: false,
                token: null,
                error: null
            }
        default:
            return state;
    }
}

export const authRegisterReducer = (state = {}, action) => {
    switch(action.type) {
        case REGISTER_REQUEST:
            return {
                loading: true
            }
        case REGISTER_SUCCESS:
            return {
                loading: false,
                success: true
            }
        case REGISTER_FAIL:
            return {
                loading: false,
                error: action.payload
            };
        case REGISTER_RESET:
            return {
                loading: false,
            }
        default :
            return state;
    }
}