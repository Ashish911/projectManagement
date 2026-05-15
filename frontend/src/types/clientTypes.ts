import type { User } from './userTypes';

export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    deleteRequest: boolean;
    assignedAdmin: Pick<User, 'id' | 'name' | 'email'> | null;
}
