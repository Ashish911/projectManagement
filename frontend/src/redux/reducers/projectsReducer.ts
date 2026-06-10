import {
    PROJECTS_LIST_REQUEST,
    PROJECTS_LIST_SUCCESS,
    PROJECTS_LIST_FAIL,
    PROJECTS_LIST_ADD,
    PROJECTS_LIST_UPDATE,
    PROJECTS_LIST_REMOVE,
    PROJECTS_SET_STATUS_FILTER,
} from '../constants/projectsConstants';
import type { Project } from '@/types/projectTypes';

interface ProjectsState {
    loading: boolean;
    projects: Project[];
    error: string | null;
    statusFilter: string | null;
}

const initialState: ProjectsState = {
    loading: false,
    projects: [],
    error: null,
    statusFilter: null,
};

export const projectsReducer = (state = initialState, action: any): ProjectsState => {
    switch (action.type) {
        case PROJECTS_LIST_REQUEST:
            return { ...state, loading: true, error: null };
        case PROJECTS_LIST_SUCCESS:
            return { ...state, loading: false, projects: action.payload };
        case PROJECTS_LIST_FAIL:
            return { ...state, loading: false, error: action.payload };
        case PROJECTS_LIST_ADD:
            return { ...state, projects: [...state.projects, action.payload] };
        case PROJECTS_LIST_UPDATE:
            return {
                ...state,
                projects: state.projects.map((p) =>
                    p.id === action.payload.id ? action.payload : p
                ),
            };
        case PROJECTS_LIST_REMOVE:
            return { ...state, projects: state.projects.filter((p) => p.id !== action.payload) };
        case PROJECTS_SET_STATUS_FILTER:
            return { ...state, statusFilter: action.payload };
        default:
            return state;
    }
};
