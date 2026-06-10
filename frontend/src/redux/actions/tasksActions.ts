import {
    TASKS_FETCH_REQUEST,
    TASKS_FETCH_SUCCESS,
    TASKS_FETCH_FAIL,
    TASKS_ADD,
    TASKS_UPDATE,
    TASKS_REMOVE,
} from '../constants/tasksConstants';
import { getTasks } from '@/api/taskApi';
import type { Task } from '@/types/taskTypes';

export const fetchTasks = (projectId: string) => async (dispatch: any, getState: any) => {
    const { selectedProjectId, tasks } = getState().tasks;
    // Cache hit: same project and already have data
    if (selectedProjectId === projectId && tasks.length > 0) return;
    try {
        dispatch({ type: TASKS_FETCH_REQUEST, payload: projectId });
        const data = await getTasks(projectId);
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
