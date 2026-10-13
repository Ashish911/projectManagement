import { GET_ALL_TASKS, GET_TASKS } from "@/queries/taskQueries";
import {
    CREATE_TASK,
    UPDATE_TASK,
    UPDATE_TASK_STATUS,
    DELETE_TASK,
} from "@/mutations/taskMutations";
import { gql } from "@/api/graphql";
import type { Task } from "@/types/taskTypes";

export const getTasks = async (projectId: string): Promise<Task[]> =>
    (await gql<{ tasks: Task[] }>(GET_TASKS, { projectId })).tasks;

/** Every task the user can see, across all their projects. */
export const getAllTasks = async (): Promise<Task[]> =>
    (await gql<{ allTasks: Task[] }>(GET_ALL_TASKS)).allTasks;

export const createTask = async (vars: {
    title: string;
    projectId: string;
    assignedTo?: string | null;
    deadline?: string | null;
    priority?: string;
    currentStatus?: "NEW" | "IN_PROGRESS";
}): Promise<Task> => (await gql<{ createTask: Task }>(CREATE_TASK, vars)).createTask;

/** null for `assignedTo` / `deadline` clears it. */
export const updateTask = async (vars: {
    id: string;
    title?: string;
    assignedTo?: string | null;
    deadline?: string | null;
    priority?: string;
}): Promise<Task> => (await gql<{ updateTask: Task }>(UPDATE_TASK, vars)).updateTask;

export const updateTaskStatus = async (id: string, status: string): Promise<Task> =>
    (await gql<{ updateTaskStatus: Task }>(UPDATE_TASK_STATUS, { id, status })).updateTaskStatus;

export const deleteTask = async (id: string): Promise<void> => {
    await gql(DELETE_TASK, { id });
};
