const PROJECT_FIELDS = `
    id
    name
    description
    status
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

export const ADD_PROJECT = `
    mutation CreateProject($name: String!, $description: String, $clientId: ID!, $status: ProjectStatus) {
        addProject(name: $name, description: $description, clientId: $clientId, status: $status) {
            ${PROJECT_FIELDS}
        }
    }
`;

export const UPDATE_PROJECT = `
    mutation UpdateProject($id: ID!, $name: String, $description: String, $status: UpdateProjectStatus) {
        updateProject(id: $id, name: $name, description: $description, status: $status) {
            ${PROJECT_FIELDS}
        }
    }
`;

export const DELETE_PROJECT = `
    mutation DeleteProject($id: ID!) {
        deleteProject(id: $id) {
            id
        }
    }
`;

export const ADD_USER_TO_PROJECT = `
    mutation AddUserToProject($id: ID!, $users: [ID]!) {
        addUserToProject(id: $id, users: $users) {
            ${PROJECT_FIELDS}
        }
    }
`;

export const REMOVE_USER_FROM_PROJECT = `
    mutation RemoveUserFromProject($id: ID!, $users: [ID]!) {
        removeUserFromProject(id: $id, users: $users) {
            ${PROJECT_FIELDS}
        }
    }
`;
