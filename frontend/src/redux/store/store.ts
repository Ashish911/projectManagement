import { combineReducers } from 'redux';
import { configureStore } from "@reduxjs/toolkit";
import { authLoginReducer, authRegisterReducer } from '../reducers/authReducers';
import { profileReducer } from "@/redux/reducers/userReducers.ts";
import { preferenceReducer } from "@/redux/reducers/preferenceReducer.ts";

// Load token from localStorage when app starts
const preloadedState = {
    login: {
        token: (() => {
            const token = localStorage.getItem("token");

            if (!token) return null;

            try {
                // const parsedToken = JSON.parse(token);

                const payload = JSON.parse(atob(token.split(".")[1]));

                if (payload.exp * 1000 > Date.now()) {
                    return token;
                } else {
                    localStorage.removeItem("token");
                    return null;
                }
            } catch (error) {
                console.error("Invalid or corrupted token:", error);
                localStorage.removeItem("token");
                return null;
            }
        })(),
    },
    register: {

    },
};

const rootReducer = combineReducers({
    login: authLoginReducer,
    register: authRegisterReducer,
    profile: profileReducer,
    preference: preferenceReducer,
});

// Configure Store
const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;