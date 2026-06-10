import {
    SUB_TASKS_FETCH_REQUEST,
    SUB_TASKS_FETCH_SUCCESS,
    SUB_TASKS_FETCH_FAIL,
    SUB_TASKS_ADD,
    SUB_TASKS_UPDATE,
    SUB_TASKS_REMOVE,
} from '../constants/subTasksConstants';
import type { SubTask } from '@/types/subTaskTypes';

interface SubTasksState {
    loading: boolean;
    subTasks: SubTask[];
    selectedTaskId: string | null;
    error: string | null;
}

const initialState: SubTasksState = {
    loading: false,
    subTasks: [],
    selectedTaskId: null,
    error: null,
};

export const subTasksReducer = (state = initialState, action: any): SubTasksState => {
    switch (action.type) {
        case SUB_TASKS_FETCH_REQUEST:
            return { ...state, loading: true, error: null, selectedTaskId: action.payload };
        case SUB_TASKS_FETCH_SUCCESS:
            return { ...state, loading: false, subTasks: action.payload };
        case SUB_TASKS_FETCH_FAIL:
            return { ...state, loading: false, error: action.payload };
        case SUB_TASKS_ADD:
            return { ...state, subTasks: [...state.subTasks, action.payload] };
        case SUB_TASKS_UPDATE:
            return {
                ...state,
                subTasks: state.subTasks.map((s) =>
                    s.id === action.payload.id ? action.payload : s
                ),
            };
        case SUB_TASKS_REMOVE:
            return { ...state, subTasks: state.subTasks.filter((s) => s.id !== action.payload) };
        default:
            return state;
    }
};
