const CLIENT_FIELDS = `
    id
    name
    email
    phone
    deleteRequest
    assignedAdmin {
        id
        name
        email
    }
`;

export const ADD_CLIENT = `
    mutation AddClient($name: String!, $email: String!, $phone: String!, $assignedAdmin: ID) {
        addClient(name: $name, email: $email, phone: $phone, assignedAdmin: $assignedAdmin) {
            ${CLIENT_FIELDS}
        }
    }
`;

export const UPDATE_CLIENT = `
    mutation UpdateClient($id: ID!, $name: String!, $email: String!, $phone: String!, $assignedAdmin: ID) {
        updateClient(id: $id, name: $name, email: $email, phone: $phone, assignedAdmin: $assignedAdmin) {
            ${CLIENT_FIELDS}
        }
    }
`;

export const CONFIRM_DELETE_CLIENT = `
    mutation ConfirmDeleteClient($id: ID!) {
        confirmDeleteClient(id: $id) {
            id
        }
    }
`;

export const DELETE_CLIENT_BY_SUPER_ADMIN = `
    mutation DeleteClientBySuperAdmin($id: ID!) {
        deleteClientBySuperAdmin(id: $id) {
            id
        }
    }
`;

export const FORCE_DELETE_CLIENT = `
    mutation ForceDeleteClient($id: ID!) {
        forceDeleteClient(id: $id) {
            id
        }
    }
`;

export const ASSIGN_ADMIN = `
    mutation AssignAdmin($id: ID!, $assignedAdmin: ID!) {
        assignAdmin(id: $id, assignedAdmin: $assignedAdmin) {
            ${CLIENT_FIELDS}
        }
    }
`;
