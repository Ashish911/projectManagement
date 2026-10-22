export const UPDATE_PROFILE = `
    mutation UpdateProfile($name: String, $number: String, $dob: String, $gender: String) {
        updateProfile(name: $name, number: $number, dob: $dob, gender: $gender) {
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

export const FORGOT_PASSWORD = `
    mutation ForgotPasswordMutation($email: String!) {
        forgotPassword(email: $email) {
            message
        }
    }
`;

export const RESET_PASSWORD = `
    mutation ResetPasswordMutation($token: String!, $password: String!) {
        resetPassword(token: $token, password: $password) {
            message
        }
    }
`;

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

const USER_FIELDS = `
    id
    name
    email
    number
    dob
    gender
    role
    status
    lastLoginAt
`;

export const CREATE_USER = `
    mutation CreateUser($name: String!, $email: String!, $number: String!, $gender: String!, $dob: String, $role: String, $clientId: ID, $mode: String, $password: String) {
        createUser(name: $name, email: $email, number: $number, gender: $gender, dob: $dob, role: $role, clientId: $clientId, mode: $mode, password: $password) {
            ${USER_FIELDS}
        }
    }
`;

export const UPDATE_USER = `
    mutation UpdateUser($id: ID!, $name: String, $email: String, $number: String, $gender: String, $dob: String) {
        updateUser(id: $id, name: $name, email: $email, number: $number, gender: $gender, dob: $dob) {
            ${USER_FIELDS}
        }
    }
`;

export const CHANGE_USER_ROLES = `
    mutation ChangeUserRoles($ids: [ID!]!, $role: String!, $clientId: ID) {
        changeUserRoles(ids: $ids, role: $role, clientId: $clientId) {
            ${USER_FIELDS}
        }
    }
`;

export const UNLOCK_USERS = `
    mutation UnlockUsers($ids: [ID!]!) {
        unlockUsers(ids: $ids) {
            ${USER_FIELDS}
        }
    }
`;

export const RESEND_INVITE = `
    mutation ResendInvite($id: ID!) {
        resendInvite(id: $id) {
            message
        }
    }
`;

export const DELETE_USERS = `
    mutation DeleteUsers($ids: [ID!]!) {
        deleteUsers(ids: $ids) {
            id
        }
    }
`;

export const CHANGE_PASSWORD = `
    mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
        changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
            message
        }
    }
`;
