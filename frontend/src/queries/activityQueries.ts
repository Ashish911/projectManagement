export const GET_ACTIVITY = `
    query GetActivity($limit: Int) {
        activity(limit: $limit) {
            id
            action
            summary
            reason
            createdAt
            actor { id name }
        }
    }
`;
