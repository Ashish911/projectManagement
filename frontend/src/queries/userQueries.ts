export const PROFILE = `
    query GetProfile {
        profile{
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
        }
    }
`;