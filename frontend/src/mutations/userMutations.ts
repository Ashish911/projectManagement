export const DELETE_USER = `
    mutation DeleteUser($userId: ID!) {
        deleteUser(userId: $userId) {
            id
        }
    }
`;

export const PROMOTE_TO_ADMIN = `
    mutation PromoteToAdmin($userId: ID!) {
        promoteToAdmin(userId: $userId) {
            id
            role
        }
    }
`;
