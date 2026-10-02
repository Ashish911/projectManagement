# GraphQL API Routes

All operations are served at a single endpoint:

| Transport | URL |
|-----------|-----|
| HTTP (queries & mutations) | `POST http://localhost:8000/graphql` |
| WebSocket (subscriptions) | `ws://localhost:8000/graphql` |

> **Authentication**: All operations require a `Bearer <token>` header except the four public operations listed below. WebSocket connections must pass the token in `connectionParams.Authorization` (or `authorization`).
>
> The operation name is read from `operationName`, or from the query text if that is missing. Names that are not plain identifiers of up to 64 characters are treated as `unknown` and always require a token. A missing or invalid token returns `UNAUTHORIZED` with HTTP 401.

## Operational HTTP Endpoints

Plain HTTP, no authentication. Not part of the GraphQL schema.

| Method + URL | Returns | Purpose |
|--------------|---------|---------|
| `GET http://localhost:8000/health/live` | `200 {"status":"ok"}` | Liveness: the process is up |
| `GET http://localhost:8000/health/ready` | `200` or `503` with `{"status", "checks": {"mongo", "redis"}}` | Readiness: `503` only if MongoDB is down; Redis is reported but optional |
| `GET http://localhost:9090/metrics` | Prometheus text format | Metrics scrape endpoint (`METRICS_PORT`); aggregated across workers in cluster mode |

---

## Public Operations (no token required)

| Operation | Type | Description |
|-----------|------|-------------|
| `LoginMutation` | Mutation | Authenticate and receive a JWT token |
| `RegisterMutation` | Mutation | Create a new user account |
| `ForgotPasswordMutation` | Mutation | Request a password-reset link by email |
| `ResetPasswordMutation` | Mutation | Set a new password using the reset token |

---

## Queries

### User

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `profile` | — | `UserType` | Any authenticated |
| `users` | — | `[UserType]` | `SUPER_ADMIN` (all users), `CLIENT_ADMIN` (project members only) |
| `user` | `id: ID!` | `UserType` | `SUPER_ADMIN`, `CLIENT_ADMIN` |

### Client

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `clients` | — | `[ClientType]` | `SUPER_ADMIN` only |
| `client` | `id: ID!` | `ClientType` | `SUPER_ADMIN`; `CLIENT_ADMIN` (own client only) |

### Project

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `projects` | — | `[ProjectType]` | All roles (scoped by role — see below) |
| `project` | `id: ID!` | `ProjectType` | All roles (access-checked) |

> Role scoping for `projects`: `SUPER_ADMIN` → all; `CLIENT_ADMIN` → their client's projects; `USER` → assigned projects only.

### Task

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `tasks` | `projectId: ID!` | `[TaskType]` | All roles; `USER` must be assigned to the project |
| `task` | `id: ID!` | `TaskType` | All roles; `USER` must be `assignedTo` or `createdBy` |

### SubTask

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `subTasks` | `taskId: ID!` | `[SubTaskType]` | All roles; `USER` must be `assignedTo` or `createdBy` on parent task |
| `subTask` | `id: ID!` | `SubTaskType` | All roles; `USER` must be `assignedTo` or `createdBy` |

### Notification

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `notifications` | — | `[NotificationType]` | Any authenticated (own notifications only) |
| `notification` | `id: ID!` | `NotificationType` | Any authenticated (ownership enforced) |

### Preference

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `preference` | — | `PreferenceType` | Any authenticated (own preference only) |

---

## Mutations

### Authentication

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `login` | `email: String!, password: String!` | `AuthType` (token + expiry) | PUBLIC; same error for unknown email and wrong password |
| `register` | `name, email, password, number, gender, dob` | `UserType` | PUBLIC; always creates a `USER` |
| `forgotPassword` | `email: String!` | `ForgotPasswordType` (`message`; `token` is always null) | PUBLIC; emails a `/reset-password?token=` link |
| `resetPassword` | `token: String!, password: String!` | `MessageType` | PUBLIC |
| `updateProfile` | `name, number, dob, gender` | `UserType` | Any authenticated |
| `promoteToAdmin` | `userId: ID!` | `UserType` | `SUPER_ADMIN` only |
| `deleteUser` | `userId: ID!` | `MessageType` | `SUPER_ADMIN` only (cannot delete self) |

### Client

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `addClient` | `name, email, phone, assignedAdmin: ID` | `ClientType` | `SUPER_ADMIN` only |
| `updateClient` | `id: ID!, name, email, phone` | `ClientType` | `SUPER_ADMIN`; `CLIENT_ADMIN` (own client) |
| `confirmDeleteClient` | `id: ID!` | `MessageType` | `CLIENT_ADMIN` (own client — sets `deleteRequest = true`) |
| `deleteClientBySuperAdmin` | `id: ID!` | `MessageType` | `SUPER_ADMIN` (requires `deleteRequest = true`) |
| `forceDeleteClient` | `id: ID!` | `MessageType` | `SUPER_ADMIN` (bypasses `deleteRequest` flag) |
| `assignAdmin` | `clientId: ID!, userId: ID!` | `ClientType` | `SUPER_ADMIN` only |

### Project

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `addProject` | `name, description, clientId, status` | `ProjectType` | `SUPER_ADMIN`; `CLIENT_ADMIN` (own client only) |
| `updateProject` | `id: ID!, name, description, status` | `ProjectType` | `SUPER_ADMIN`; `CLIENT_ADMIN` (own client only) |
| `deleteProject` | `id: ID!` | `MessageType` | `SUPER_ADMIN`; `CLIENT_ADMIN` (own client only) |
| `addUserToProject` | `projectId: ID!, userIds: [ID!]!` | `ProjectType` | `SUPER_ADMIN`; `CLIENT_ADMIN` |
| `removeUserFromProject` | `projectId: ID!, userIds: [ID!]!` | `ProjectType` | `SUPER_ADMIN`; `CLIENT_ADMIN` |

### Task

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `createTask` | `title, priority, deadline, projectId, assignedTo` | `TaskType` | `SUPER_ADMIN`; `CLIENT_ADMIN` |
| `updateTask` | `id: ID!, title, priority, deadline, assignedTo` | `TaskType` | `SUPER_ADMIN`; `CLIENT_ADMIN`; `USER` (if `assignedTo`) |
| `updateTaskStatus` | `id: ID!, status: String!` | `TaskType` | `SUPER_ADMIN`; `CLIENT_ADMIN`; `USER` (if `assignedTo`) |
| `deleteTask` | `id: ID!` | `MessageType` | `SUPER_ADMIN`; `CLIENT_ADMIN` (cascades to SubTasks) |

### SubTask

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `createSubTask` | `title, priority, deadline, taskId, assignedTo` | `SubTaskType` | `SUPER_ADMIN`; `CLIENT_ADMIN`; `USER` (if assigned to parent task) |
| `updateSubTask` | `id: ID!, title, priority, deadline, assignedTo` | `SubTaskType` | `SUPER_ADMIN`; `CLIENT_ADMIN`; `USER` (if `assignedTo`) |
| `updateSubTaskStatus` | `id: ID!, status: String!` | `SubTaskType` | `SUPER_ADMIN`; `CLIENT_ADMIN`; `USER` (if `assignedTo`) |
| `deleteSubTask` | `id: ID!` | `MessageType` | `SUPER_ADMIN`; `CLIENT_ADMIN`; `USER` (if `createdBy`) |

### Notification

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `markAsRead` | `id: ID!` | `NotificationType` | Any authenticated (own notifications only) |
| `markAllAsRead` | — | `MessageType` | Any authenticated |
| `deleteNotification` | `id: ID!` | `MessageType` | Any authenticated; `SUPER_ADMIN` can delete any |
| `deleteAllNotifications` | — | `MessageType` | Any authenticated |

### Preference

| Operation | Arguments | Returns | Role |
|-----------|-----------|---------|------|
| `updatePreference` | `theme: LIGHT\|DARK, language: ENGLISH\|JAPANESE\|KOREAN` | `PreferenceType` | Any authenticated |

---

## Subscriptions

| Operation | Arguments | Returns | Role | Notes |
|-----------|-----------|---------|------|-------|
| `notificationCreated` | — | `NotificationType` | Any authenticated | Filtered per user via Redis PubSub; token verified at connection time |

---

## Return Types Reference

| Type | Fields |
|------|--------|
| `UserType` | `id, name, email, number, role, dob, gender` |
| `AuthType` | `id, email, token, tokenExpiration` |
| `ForgotPasswordType` | `message`, `token` (deprecated, always null) |
| `MessageType` | `message` |
| `ClientType` | `id, name, email, phone, deleteRequest, assignedAdmin (UserType)` |
| `ProjectType` | `id, name, description, status, client (ClientType), user ([UserType])` |
| `TaskType` | `id, title, priority, deadline, currentStatus, assignedTo (UserType), createdBy (UserType), project (ProjectType)` |
| `SubTaskType` | `id, title, priority, deadline, currentStatus, assignedTo (UserType), createdBy (UserType)` |
| `NotificationType` | `id, content, status, createdAt, user (UserType)` |
| `PreferenceType` | `id, theme, language, user (UserType)` |

---

## Enum Values Reference

| Enum | Values |
|------|--------|
| Role | `SUPER_ADMIN`, `CLIENT_ADMIN`, `USER` |
| Project Status | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` |
| Task / SubTask Priority | `URGENT`, `HIGH`, `NORMAL`, `BACKLOG` |
| Task / SubTask Status | `NEW`, `IN_PROGRESS`, `RESOLVED`, `REOPENED` |
| Notification Status | `READ`, `UNREAD` |
| Theme | `LIGHT`, `DARK` |
| Language | `ENGLISH`, `JAPANESE`, `KOREAN` |
| Gender | `MALE`, `FEMALE`, `OTHERS` |
