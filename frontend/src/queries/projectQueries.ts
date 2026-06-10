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
