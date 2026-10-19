import {
    TASKS_FETCH_REQUEST,
    TASKS_FETCH_SUCCESS,
    TASKS_FETCH_FAIL,
    TASKS_ADD,
    TASKS_UPDATE,
    TASKS_REMOVE,
} from '../constants/tasksConstants';
import type { Task } from '@/types/taskTypes';

/** Every task the user can see, across all their projects (`allTasks` query). */
interface TasksState {
    loading: boolean;
    /** True once the first fetch finished, so screens can tell "no tasks" from "not loaded yet" */
    loaded: boolean;
    tasks: Task[];
    error: string | null;
}

const initialState: TasksState = {
    loading: false,
    loaded: false,
    tasks: [],
    error: null,
};

export const tasksReducer = (state = initialState, action: any): TasksState => {
    switch (action.type) {
        case TASKS_FETCH_REQUEST:
            return { ...state, loading: true, error: null };
        case TASKS_FETCH_SUCCESS:
            return { ...state, loading: false, loaded: true, tasks: action.payload };
        case TASKS_FETCH_FAIL:
            return { ...state, loading: false, loaded: true, error: action.payload };
        case TASKS_ADD:
            return { ...state, tasks: [action.payload, ...state.tasks.filter((t) => t.id !== action.payload.id)] };
        case TASKS_UPDATE:
            return {
                ...state,
                tasks: state.tasks.map((t) =>
                    t.id === action.payload.id ? { ...t, ...action.payload } : t
                ),
            };
        case TASKS_REMOVE:
            return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload) };
        default:
            return state;
    }
};
