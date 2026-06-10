import {
    PROJECTS_LIST_REQUEST,
    PROJECTS_LIST_SUCCESS,
    PROJECTS_LIST_FAIL,
    PROJECTS_LIST_ADD,
    PROJECTS_LIST_UPDATE,
    PROJECTS_LIST_REMOVE,
    PROJECTS_SET_STATUS_FILTER,
} from '../constants/projectsConstants';
import { getProjects } from '@/api/projectApi';
import type { Project } from '@/types/projectTypes';

export const fetchProjects = () => async (dispatch: any, getState: any) => {
    const { projects } = getState().projects;
    if (projects.length > 0) return; // already cached
    try {
        dispatch({ type: PROJECTS_LIST_REQUEST });
        const data = await getProjects();
        dispatch({ type: PROJECTS_LIST_SUCCESS, payload: data });
    } catch (error: any) {
        dispatch({ type: PROJECTS_LIST_FAIL, payload: error.message });
    }
};

export const addProjectToStore = (project: Project) => ({
    type: PROJECTS_LIST_ADD,
    payload: project,
});

export const updateProjectInStore = (project: Project) => ({
    type: PROJECTS_LIST_UPDATE,
    payload: project,
});

export const removeProjectFromStore = (id: string) => ({
    type: PROJECTS_LIST_REMOVE,
    payload: id,
});

export const setProjectsStatusFilter = (status: string | null) => ({
    type: PROJECTS_SET_STATUS_FILTER,
    payload: status,
});
