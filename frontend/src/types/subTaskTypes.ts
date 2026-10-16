import type { User } from './userTypes';
import type { Priority, TaskStatus } from './taskTypes';

export interface SubTask {
    id: string;
    title: string;
    priority: Priority;
    deadline: string | null;
    currentStatus: TaskStatus;
    assignedTo: Pick<User, 'id' | 'name' | 'email'> | null;
    createdBy: Pick<User, 'id' | 'name' | 'email'> | null;
}
