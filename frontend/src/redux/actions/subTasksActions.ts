import {
    SUB_TASKS_FETCH_REQUEST,
    SUB_TASKS_FETCH_SUCCESS,
    SUB_TASKS_FETCH_FAIL,
    SUB_TASKS_ADD,
    SUB_TASKS_UPDATE,
    SUB_TASKS_REMOVE,
} from '../constants/subTasksConstants';
import { getSubTasks } from '@/api/subTaskApi';
import type { SubTask } from '@/types/subTaskTypes';

export const fetchSubTasks = (taskId: string) => async (dispatch: any, getState: any) => {
    const { selectedTaskId, subTasks } = getState().subTasks;
    if (selectedTaskId === taskId && subTasks.length > 0) return; // already cached
    try {
        dispatch({ type: SUB_TASKS_FETCH_REQUEST, payload: taskId });
        const data = await getSubTasks(taskId);
        dispatch({ type: SUB_TASKS_FETCH_SUCCESS, payload: data });
    } catch (error: any) {
        dispatch({ type: SUB_TASKS_FETCH_FAIL, payload: error.message });
    }
};

export const addSubTaskToStore = (subTask: SubTask) => ({
    type: SUB_TASKS_ADD,
    payload: subTask,
});

export const updateSubTaskInStore = (subTask: SubTask) => ({
    type: SUB_TASKS_UPDATE,
    payload: subTask,
});

export const removeSubTaskFromStore = (id: string) => ({
    type: SUB_TASKS_REMOVE,
    payload: id,
});
