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
            token
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
