const SUB_TASK_FIELDS = `
    id
    title
    priority
    deadline
    currentStatus
    assignedTo {
        id
        name
        email
    }
    createdBy {
        id
        name
        email
    }
`;

export const GET_SUB_TASKS = `
    query GetSubTasks($taskId: ID!) {
        subTasks(taskId: $taskId) {
            ${SUB_TASK_FIELDS}
        }
    }
`;
