import {
    TASKS_FETCH_REQUEST,
    TASKS_FETCH_SUCCESS,
    TASKS_FETCH_FAIL,
    TASKS_ADD,
    TASKS_UPDATE,
    TASKS_REMOVE,
} from '../constants/tasksConstants';
import type { Task } from '@/types/taskTypes';

interface TasksState {
    loading: boolean;
    tasks: Task[];
    selectedProjectId: string | null;
    error: string | null;
}

const initialState: TasksState = {
    loading: false,
    tasks: [],
    selectedProjectId: null,
    error: null,
};

export const tasksReducer = (state = initialState, action: any): TasksState => {
    switch (action.type) {
        case TASKS_FETCH_REQUEST:
            return { ...state, loading: true, error: null, selectedProjectId: action.payload };
        case TASKS_FETCH_SUCCESS:
            return { ...state, loading: false, tasks: action.payload };
        case TASKS_FETCH_FAIL:
            return { ...state, loading: false, error: action.payload };
        case TASKS_ADD:
            return { ...state, tasks: [...state.tasks, action.payload] };
        case TASKS_UPDATE:
            return {
                ...state,
                tasks: state.tasks.map((t) =>
                    t.id === action.payload.id ? action.payload : t
                ),
            };
        case TASKS_REMOVE:
            return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload) };
        default:
            return state;
    }
};
