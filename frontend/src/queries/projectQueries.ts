const PROJECT_FIELDS = `
    id
    name
    description
    status
    dueDate
    canManage
    client {
        id
        name
    }
    user {
        id
        name
        email
    }
`;

export const GET_PROJECTS = `
    query GetProjects {
        projects {
            ${PROJECT_FIELDS}
        }
    }
`;

export const GET_PROJECT = `
    query GetProject($id: ID!) {
        project(id: $id) {
            ${PROJECT_FIELDS}
        }
    }
`;

/** People who can be added to a project's team (Manage team picker). */
export const GET_ASSIGNABLE_USERS = `
    query AssignableUsers($projectId: ID) {
        assignableUsers(projectId: $projectId) {
            id
            name
            email
            role
        }
    }
`;
