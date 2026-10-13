import { GET_SUB_TASKS } from "@/queries/subTaskQueries";
import {
    CREATE_SUB_TASK,
    UPDATE_SUB_TASK,
    UPDATE_SUB_TASK_STATUS,
    DELETE_SUB_TASK,
} from "@/mutations/subTaskMutations";
import { gql } from "@/api/graphql";
import type { SubTask } from "@/types/subTaskTypes";

export const getSubTasks = async (taskId: string): Promise<SubTask[]> =>
    (await gql<{ subTasks: SubTask[] }>(GET_SUB_TASKS, { taskId })).subTasks;

export const createSubTask = async (vars: {
    title: string;
    taskId: string;
    assignedTo?: string | null;
    deadline?: string | null;
    priority?: string;
}): Promise<SubTask> => (await gql<{ createSubTask: SubTask }>(CREATE_SUB_TASK, vars)).createSubTask;

export const updateSubTask = async (vars: {
    id: string;
    title?: string;
    assignedTo?: string | null;
    deadline?: string | null;
    priority?: string;
}): Promise<SubTask> => (await gql<{ updateSubTask: SubTask }>(UPDATE_SUB_TASK, vars)).updateSubTask;

export const updateSubTaskStatus = async (id: string, status: string): Promise<SubTask> =>
    (await gql<{ updateSubTaskStatus: SubTask }>(UPDATE_SUB_TASK_STATUS, { id, status })).updateSubTaskStatus;

export const deleteSubTask = async (id: string): Promise<void> => {
    await gql(DELETE_SUB_TASK, { id });
};
