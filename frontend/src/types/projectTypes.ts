import type { Client } from './clientTypes';
import type { User } from './userTypes';

export interface Project {
    id: string;
    name: string;
    description: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    dueDate?: string | null;
    /** True if the viewer runs this project (super admin, or its client's admin), not just sits on its team. */
    canManage: boolean;
    client: Pick<Client, 'id' | 'name'> | null;
    user: Pick<User, 'id' | 'name' | 'email'>[];
}

/** Someone who can be added to a project team (`assignableUsers`). */
export interface TeamCandidate {
    id: string;
    name: string;
    email: string;
    role: "USER" | "CLIENT_ADMIN";
}
