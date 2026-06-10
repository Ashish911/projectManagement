import type { Client } from './clientTypes';
import type { User } from './userTypes';

export interface Project {
    id: string;
    name: string;
    description: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    client: Pick<Client, 'id' | 'name'> | null;
    user: Pick<User, 'id' | 'name' | 'email'>[];
}
