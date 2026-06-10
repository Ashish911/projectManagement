const TASK_FIELDS = `
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
    project {
        id
        name
    }
`;

export const CREATE_TASK = `
    mutation CreateTask($title: String!, $projectId: ID!, $assignedTo: ID, $deadline: String, $priority: TaskPriority) {
        createTask(title: $title, projectId: $projectId, assignedTo: $assignedTo, deadline: $deadline, priority: $priority) {
            ${TASK_FIELDS}
        }
    }
`;

export const UPDATE_TASK = `
    mutation UpdateTask($id: ID!, $title: String, $assignedTo: ID, $deadline: String, $priority: UpdateTaskPriority) {
        updateTask(id: $id, title: $title, assignedTo: $assignedTo, deadline: $deadline, priority: $priority) {
            ${TASK_FIELDS}
        }
    }
`;

export const UPDATE_TASK_STATUS = `
    mutation UpdateTaskStatus($id: ID!, $status: TaskStatus!) {
        updateTaskStatus(id: $id, status: $status) {
            ${TASK_FIELDS}
        }
    }
`;

export const DELETE_TASK = `
    mutation DeleteTask($id: ID!) {
        deleteTask(id: $id) {
            id
        }
    }
`;
