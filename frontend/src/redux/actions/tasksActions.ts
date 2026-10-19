import {
    TASKS_FETCH_REQUEST,
    TASKS_FETCH_SUCCESS,
    TASKS_FETCH_FAIL,
    TASKS_ADD,
    TASKS_UPDATE,
    TASKS_REMOVE,
} from '../constants/tasksConstants';
import { getAllTasks } from '@/api/taskApi';
import type { Task } from '@/types/taskTypes';

/** Loads every task the user can see. Skips the call once loaded unless `force` is set. */
export const fetchAllTasks = (force = false) => async (dispatch: any, getState: any) => {
    const { loaded, loading } = getState().tasks;
    if (!force && (loaded || loading)) return;
    try {
        dispatch({ type: TASKS_FETCH_REQUEST });
        const data = await getAllTasks();
        dispatch({ type: TASKS_FETCH_SUCCESS, payload: data });
    } catch (error: any) {
        dispatch({ type: TASKS_FETCH_FAIL, payload: error.message });
    }
};

export const addTaskToStore = (task: Task) => ({
    type: TASKS_ADD,
    payload: task,
});

export const updateTaskInStore = (task: Task) => ({
    type: TASKS_UPDATE,
    payload: task,
});

export const removeTaskFromStore = (id: string) => ({
    type: TASKS_REMOVE,
    payload: id,
});
