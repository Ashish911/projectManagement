import type { User } from './userTypes';

export interface Task {
    id: string;
    title: string;
    priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'BACKLOG';
    deadline: string;
    currentStatus: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED';
    assignedTo: Pick<User, 'id' | 'name' | 'email'> | null;
    createdBy: Pick<User, 'id' | 'name' | 'email'> | null;
    project: { id: string; name: string } | null;
}
