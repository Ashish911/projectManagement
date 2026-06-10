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

export const CREATE_SUB_TASK = `
    mutation CreateSubTask($title: String!, $taskId: ID!, $assignedTo: ID, $deadline: String, $priority: SubTaskPriority) {
        createSubTask(title: $title, taskId: $taskId, assignedTo: $assignedTo, deadline: $deadline, priority: $priority) {
            ${SUB_TASK_FIELDS}
        }
    }
`;

export const UPDATE_SUB_TASK = `
    mutation UpdateSubTask($id: ID!, $title: String, $assignedTo: ID, $deadline: String, $priority: UpdateSubTaskPriority) {
        updateSubTask(id: $id, title: $title, assignedTo: $assignedTo, deadline: $deadline, priority: $priority) {
            ${SUB_TASK_FIELDS}
        }
    }
`;

export const UPDATE_SUB_TASK_STATUS = `
    mutation UpdateSubTaskStatus($id: ID!, $status: SubTaskStatus!) {
        updateSubTaskStatus(id: $id, status: $status) {
            ${SUB_TASK_FIELDS}
        }
    }
`;

export const DELETE_SUB_TASK = `
    mutation DeleteSubTask($id: ID!) {
        deleteSubTask(id: $id) {
            id
        }
    }
`;
