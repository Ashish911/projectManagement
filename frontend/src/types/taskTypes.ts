import type { User } from './userTypes';

export type Priority = 'URGENT' | 'HIGH' | 'NORMAL' | 'BACKLOG';
export type TaskStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED';

export interface Task {
    id: string;
    title: string;
    priority: Priority;
    deadline: string | null;
    currentStatus: TaskStatus;
    assignedTo: Pick<User, 'id' | 'name' | 'email'> | null;
    createdBy: Pick<User, 'id' | 'name' | 'email'> | null;
    project: { id: string; name: string } | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    resolvedAt?: string | null;
    subTaskStats?: { done: number; total: number };
    /** The viewer's own subtasks on this task (from `allTasks` only; absent on single-task replies) */
    mySubTasks?: MySubTask[] | null;
}

/** One of the viewer's subtasks, as listed under its parent task. */
export interface MySubTask {
    id: string;
    title: string;
    currentStatus: TaskStatus;
    priority: Priority;
    deadline: string | null;
}
