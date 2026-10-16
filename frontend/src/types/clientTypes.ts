import type { User } from './userTypes';

export interface Client {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    deleteRequest: boolean;
    assignedAdmin: Pick<User, 'id' | 'name' | 'email'> | null;
}
