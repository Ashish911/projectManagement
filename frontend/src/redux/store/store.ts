import { combineReducers } from 'redux';
import { configureStore } from "@reduxjs/toolkit";
import { authLoginReducer, authRegisterReducer } from '../reducers/authReducers';
import { profileReducer } from "@/redux/reducers/userReducers.ts";
import { preferenceReducer } from "@/redux/reducers/preferenceReducer.ts";
import { usersListReducer } from "@/redux/reducers/usersListReducer.ts";
import { clientsReducer } from "@/redux/reducers/clientsReducer.ts";
import { projectsReducer } from "@/redux/reducers/projectsReducer.ts";
import { tasksReducer } from "@/redux/reducers/tasksReducer.ts";
import { subTasksReducer } from "@/redux/reducers/subTasksReducer.ts";

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
    usersList: usersListReducer,
    clients: clientsReducer,
    projects: projectsReducer,
    tasks: tasksReducer,
    subTasks: subTasksReducer,
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