import { GET_PROJECTS } from "@/queries/projectQueries";
import {
    ADD_PROJECT,
    UPDATE_PROJECT,
    DELETE_PROJECT,
    ADD_USER_TO_PROJECT,
    REMOVE_USER_FROM_PROJECT,
} from "@/mutations/projectMutations";
import { gql } from "@/api/graphql";
import type { Project } from "@/types/projectTypes";

export const getProjects = async (): Promise<Project[]> =>
    (await gql<{ projects: Project[] }>(GET_PROJECTS)).projects;

export const addProject = async (vars: {
    name: string;
    description?: string;
    clientId: string;
    status?: string;
    dueDate?: string | null;
}): Promise<Project> => (await gql<{ addProject: Project }>(ADD_PROJECT, vars)).addProject;

export const updateProject = async (vars: {
    id: string;
    name?: string;
    description?: string;
    status?: string;
    dueDate?: string | null;
}): Promise<Project> => (await gql<{ updateProject: Project }>(UPDATE_PROJECT, vars)).updateProject;

export const deleteProject = async (id: string): Promise<void> => {
    await gql(DELETE_PROJECT, { id });
};

export const addUserToProject = async (vars: { id: string; users: string[] }): Promise<Project> =>
    (await gql<{ addUserToProject: Project }>(ADD_USER_TO_PROJECT, vars)).addUserToProject;

export const removeUserFromProject = async (vars: { id: string; users: string[] }): Promise<Project> =>
    (await gql<{ removeUserFromProject: Project }>(REMOVE_USER_FROM_PROJECT, vars)).removeUserFromProject;
