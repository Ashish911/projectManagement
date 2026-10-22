const COMMENT_FIELDS = `
    id
    content
    taskId
    subTaskId
    createdAt
    updatedAt
    author {
        id
        name
        email
    }
`;

export const GET_TASK_COMMENTS = `
    query GetTaskComments($taskId: ID!) {
        taskComments(taskId: $taskId) {
            ${COMMENT_FIELDS}
        }
    }
`;

export const ADD_TASK_COMMENT = `
    mutation AddTaskComment($taskId: ID!, $content: String!) {
        addTaskComment(taskId: $taskId, content: $content) {
            ${COMMENT_FIELDS}
        }
    }
`;

export const DELETE_COMMENT = `
    mutation DeleteComment($id: ID!) {
        deleteComment(id: $id) {
            id
        }
    }
`;
