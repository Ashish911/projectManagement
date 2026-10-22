export const PROFILE = `
    query GetProfile {
        profile{
            id,
            name,
            email,
            number,
            dob,
            gender,
            role
        }
    }
`;

export const GET_USERS = `
    query GetUsers {
        users {
            id
            name
            email
            number
            dob
            gender
            role
            status
            lastLoginAt
        }
    }
`;

export const GET_USER = `
    query GetUser($id: ID!) {
        user(id: $id) {
            id
            name
            email
            number
            dob
            gender
            role
            status
            lastLoginAt
        }
    }
`;