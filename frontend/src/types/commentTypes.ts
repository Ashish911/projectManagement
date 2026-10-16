import type { User } from './userTypes';

export interface Comment {
    id: string;
    content: string;
    taskId: string;
    subTaskId: string | null;
    author: Pick<User, 'id' | 'name' | 'email'> | null;
    createdAt: string | null;
    updatedAt: string | null;
}
