const TASK_FIELDS = `
    id
    title
    priority
    deadline
    currentStatus
    createdAt
    resolvedAt
    subTaskStats {
        done
        total
    }
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

export const GET_TASKS = `
    query GetTasks($projectId: ID!) {
        tasks(projectId: $projectId) {
            ${TASK_FIELDS}
        }
    }
`;

export const GET_TASK = `
    query GetTask($id: ID!) {
        task(id: $id) {
            ${TASK_FIELDS}
        }
    }
`;

export const GET_ALL_TASKS = `
    query GetAllTasks {
        allTasks {
            ${TASK_FIELDS}
        }
    }
`;
