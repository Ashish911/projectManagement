export const GET_CLIENTS = `
    query GetClients {
        clients {
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
        }
    }
`;

export const GET_CLIENT = `
    query GetClient($id: ID!) {
        client(id: $id) {
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
        }
    }
`;
