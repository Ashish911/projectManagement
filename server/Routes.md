# GraphQL API Routes

All operations are served at a single endpoint:

| Transport                  | URL                                  |
| -------------------------- | ------------------------------------ |
| HTTP (queries & mutations) | `POST http://localhost:8000/graphql` |
| WebSocket (subscriptions)  | `ws://localhost:8000/graphql`        |

> **Authentication**: All operations require a `Bearer <token>` header except the four public operations listed below. WebSocket connections must pass the token in `connectionParams.Authorization` (or `authorization`).
>
> The operation name is read from `operationName`, or from the query text if that is missing. Names that are not plain identifiers of up to 64 characters are treated as `unknown` and always require a token. A missing or invalid token returns `UNAUTHORIZED` with HTTP 401.

## Operational HTTP Endpoints

Plain HTTP, no authentication. Not part of the GraphQL schema.

| Method + URL                             | Returns                                                        | Purpose                                                                             |
| ---------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `GET http://localhost:8000/health/live`  | `200 {"status":"ok"}`                                          | Liveness: the process is up                                                         |
| `GET http://localhost:8000/health/ready` | `200` or `503` with `{"status", "checks": {"mongo", "redis"}}` | Readiness: `503` only if MongoDB is down; Redis is reported but optional            |
| `GET http://localhost:9090/metrics`      | Prometheus text format                                         | Metrics scrape endpoint (`METRICS_PORT`); aggregated across workers in cluster mode |

---

## Public Operations (no token required)

| Operation                | Type     | Description                              |
| ------------------------ | -------- | ---------------------------------------- |
| `LoginMutation`          | Mutation | Authenticate and receive a JWT token     |
| `RegisterMutation`       | Mutation | Create a new user account                |
| `ForgotPasswordMutation` | Mutation | Request a password-reset link by email   |
| `ResetPasswordMutation`  | Mutation | Set a new password using the reset token |

---

## Queries

### User

| Operation | Arguments | Returns      | Role                                                             |
| --------- | --------- | ------------ | ---------------------------------------------------------------- |
| `profile` | —         | `UserType`   | Any authenticated                                                |
| `users`   | —         | `[UserType]` | `SUPER_ADMIN` (all users), `CLIENT_ADMIN` (project members only) |
| `user`    | `id: ID!` | `UserType`   | `SUPER_ADMIN`, `CLIENT_ADMIN`                                    |

### Client

| Operation | Arguments | Returns        | Role                                            |
| --------- | --------- | -------------- | ----------------------------------------------- |
| `clients` | —         | `[ClientType]` | `SUPER_ADMIN` only                              |
| `client`  | `id: ID!` | `ClientType`   | `SUPER_ADMIN`; `CLIENT_ADMIN` (own client only) |

### Project

| Operation  | Arguments | Returns         | Role                                   |
| ---------- | --------- | --------------- | -------------------------------------- |
| `projects` | —         | `[ProjectType]` | All roles (scoped by role — see below) |
| `project`  | `id: ID!` | `ProjectType`   | All roles (access-checked)             |

> Role scoping for `projects`: `SUPER_ADMIN` → all; `CLIENT_ADMIN` → their client's projects; `USER` → assigned projects only.

### Task

| Operation | Arguments        | Returns      | Role                                                  |
| --------- | ---------------- | ------------ | ----------------------------------------------------- |
| `tasks`   | `projectId: ID!` | `[TaskType]` | All roles; `USER` must be assigned to the project     |
| `task`    | `id: ID!`        | `TaskType`   | All roles; `USER` must be `assignedTo` or `createdBy` |
| `allTasks` | —               | `[TaskType]` | All roles, scoped: `SUPER_ADMIN` all; `CLIENT_ADMIN` their client's projects; `USER` projects they're assigned to |

> `tasks` and `task` don't yet restrict a `CLIENT_ADMIN` to their own client's projects (known issue S-2 in `STATUS.md`).

### SubTask

| Operation  | Arguments     | Returns         | Role                                                                 |
| ---------- | ------------- | --------------- | -------------------------------------------------------------------- |
| `subTasks` | `taskId: ID!` | `[SubTaskType]` | All roles; `USER` must be `assignedTo` or `createdBy` on parent task |
| `subTask`  | `id: ID!`     | `SubTaskType`   | All roles; `USER` must be `assignedTo` or `createdBy`                |

### Comment

> "Project member" = a `USER` in the project's `assignedUsers`, the `CLIENT_ADMIN` of the project's client, or any `SUPER_ADMIN`.

| Operation         | Arguments        | Returns         | Role                                                         |
| ----------------- | ---------------- | --------------- | ------------------------------------------------------------ |
| `taskComments`    | `taskId: ID!`    | `[CommentType]` | Project member; task-level comments only, oldest first       |
| `subTaskComments` | `subTaskId: ID!` | `[CommentType]` | Project member; oldest first                                 |

### Notification

| Operation       | Arguments | Returns              | Role                                       |
| --------------- | --------- | -------------------- | ------------------------------------------ |
| `notifications` | —         | `[NotificationType]` | Any authenticated (own notifications only), newest first |
| `notification`  | `id: ID!` | `NotificationType`   | Any authenticated (ownership enforced)     |

### Preference

| Operation    | Arguments | Returns          | Role                                    |
| ------------ | --------- | ---------------- | --------------------------------------- |
| `preference` | —         | `PreferenceType` | Any authenticated (own preference only) |

---

## Mutations

### Authentication

| Operation        | Arguments                                    | Returns                                                  | Role                                                    |
| ---------------- | -------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| `login`          | `email: String!, password: String!`          | `AuthType` (token + expiry)                              | PUBLIC; same error for unknown email and wrong password |
| `register`       | `name, email, password, number, gender, dob` | `UserType`                                               | PUBLIC; always creates a `USER`                         |
| `forgotPassword` | `email: String!`                             | `ForgotPasswordType` (`message`; `token` is always null) | PUBLIC; emails a `/reset-password?token=` link          |
| `resetPassword`  | `token: String!, password: String!`          | `MessageType`                                            | PUBLIC                                                  |
| `updateProfile`  | `name, number, dob, gender`                  | `UserType`                                               | Any authenticated                                       |
| `promoteToAdmin` | `userId: ID!`                                | `UserType`                                               | `SUPER_ADMIN` only                                      |
| `deleteUser`     | `userId: ID!`                                | `UserType`                                            | `SUPER_ADMIN` only (cannot delete self); unassigns their tasks/subtasks, removes them from teams, frees any client they administered |
| `changePassword` | `currentPassword: String!, newPassword: String!` | `MessageType`                                        | Any authenticated (own password)                        |

### User administration (`SUPER_ADMIN` only)

| Operation         | Arguments                                                                                   | Returns       | Notes |
| ----------------- | ------------------------------------------------------------------------------------------- | ------------- | ----- |
| `createUser`      | `name!, email!, number!, gender!, dob, role, clientId, mode ("INVITE" \| "PASSWORD"), password` | `UserType`    | `INVITE` emails a 48-hour link (`/reset-password?token=…&invite=1`); `PASSWORD` sets a temporary password (min 8). `CLIENT_ADMIN` needs a `clientId` without an admin |
| `updateUser`      | `id!, name, email, number, gender, dob`                                                     | `UserType`    | Email must stay unique |
| `changeUserRoles` | `ids: [ID!]!, role!, clientId`                                                              | `[UserType]`  | `CLIENT_ADMIN` needs exactly one id and a client; at least one super admin must remain; former client admins are detached from their client |
| `unlockUsers`     | `ids: [ID!]!`                                                                               | `[UserType]`  | Clears failed sign-in attempts |
| `resendInvite`    | `id: ID!`                                                                                   | `MessageType` | Only for users who never signed in |
| `deleteUsers`     | `ids: [ID!]!`                                                                               | `[UserType]`  | Same cleanup as `deleteUser`; nothing is deleted if any id is missing or is yourself |

### Client

| Operation                  | Arguments                               | Returns       | Role                                                      |
| -------------------------- | --------------------------------------- | ------------- | --------------------------------------------------------- |
| `addClient`                | `name!, email, phone, assignedAdmin: ID, deleteRequest` | `ClientType`  | `SUPER_ADMIN` only; email and phone are optional          |
| `updateClient`             | `id: ID!, name, email, phone, assignedAdmin, deleteRequest` | `ClientType`  | `SUPER_ADMIN`; `CLIENT_ADMIN` (own client). All fields are saved as sent, including `assignedAdmin` and `deleteRequest` (see STATUS known issues) |
| `confirmDeleteClient`      | `id: ID!`                               | `ClientType` | `CLIENT_ADMIN` (own client — sets `deleteRequest = true`) |
| `deleteClientBySuperAdmin` | `id: ID!`                               | `ClientType` | `SUPER_ADMIN` (requires `deleteRequest = true`)           |
| `forceDeleteClient`        | `id: ID!`                               | `ClientType` | `SUPER_ADMIN` (bypasses `deleteRequest` flag)             |
| `assignAdmin`              | `id: ID!, assignedAdmin: ID!`           | `ClientType`  | `SUPER_ADMIN` only; notifies the new admin                |
| `declineClientDeletion`    | `id: ID!, message: String`              | `ClientType`  | `SUPER_ADMIN`; clears `deleteRequest` and notifies the client admin with the message |

### Project

| Operation               | Arguments                             | Returns       | Role                                            |
| ----------------------- | ------------------------------------- | ------------- | ----------------------------------------------- |
| `addProject`            | `name, description, clientId, status, dueDate` | `ProjectType` | `SUPER_ADMIN`; `CLIENT_ADMIN` (own client only) |
| `updateProject`         | `id: ID!, name, description, status, dueDate` (null clears) | `ProjectType` | `SUPER_ADMIN`; `CLIENT_ADMIN` (own client only) |
| `deleteProject`         | `id: ID!`                             | `ProjectType` | `SUPER_ADMIN`; `CLIENT_ADMIN` (own client only) |
| `addUserToProject`      | `id: ID!, users: [ID!]!`              | `ProjectType` | `SUPER_ADMIN`; `CLIENT_ADMIN`; notifies each new member |
| `removeUserFromProject` | `id: ID!, users: [ID!]!`              | `ProjectType` | `SUPER_ADMIN`; `CLIENT_ADMIN`                   |

### Task

| Operation          | Arguments                                          | Returns       | Role                                                    |
| ------------------ | -------------------------------------------------- | ------------- | ------------------------------------------------------- |
| `createTask`       | `title, priority, deadline, projectId, assignedTo, currentStatus (NEW \| IN_PROGRESS)` | `TaskType`    | `SUPER_ADMIN`; `CLIENT_ADMIN`                           |
| `updateTask`       | `id: ID!, title, priority, deadline, assignedTo` (null clears deadline/assignee) | `TaskType`    | `SUPER_ADMIN`; `CLIENT_ADMIN`; `USER` (if `assignedTo`) |
| `updateTaskStatus` | `id: ID!, status: String!`                         | `TaskType`    | `SUPER_ADMIN`; `CLIENT_ADMIN`; `USER` (if `assignedTo`) |
| `deleteTask`       | `id: ID!`                                          | `TaskType` | `SUPER_ADMIN`; `CLIENT_ADMIN` (cascades to SubTasks and Comments) |

### SubTask

| Operation             | Arguments                                        | Returns       | Role                                                               |
| --------------------- | ------------------------------------------------ | ------------- | ------------------------------------------------------------------ |
| `createSubTask`       | `title, priority, deadline, taskId, assignedTo`  | `SubTaskType` | `SUPER_ADMIN`; `CLIENT_ADMIN`; `USER` (if assigned to parent task) |
| `updateSubTask`       | `id: ID!, title, priority, deadline, assignedTo` | `SubTaskType` | `SUPER_ADMIN`; `CLIENT_ADMIN`; `USER` (if `assignedTo`)            |
| `updateSubTaskStatus` | `id: ID!, status: String!`                       | `SubTaskType` | `SUPER_ADMIN`; `CLIENT_ADMIN`; `USER` (if `assignedTo`)            |
| `deleteSubTask`       | `id: ID!`                                        | `SubTaskType` | `SUPER_ADMIN`; `CLIENT_ADMIN`; `USER` (if `createdBy`)             |

### Comment

| Operation           | Arguments                            | Returns       | Role                                                                    |
| ------------------- | ------------------------------------ | ------------- | ----------------------------------------------------------------------- |
| `addTaskComment`    | `taskId: ID!, content: String!`      | `CommentType` | Project member; notifies task assignee and creator (not the author)     |
| `addSubTaskComment` | `subTaskId: ID!, content: String!`   | `CommentType` | Project member; notifies subtask assignee and creator (not the author)  |
| `updateComment`     | `id: ID!, content: String!`          | `CommentType` | Author only, while still a project member                               |
| `deleteComment`     | `id: ID!`                            | `CommentType` | Author; `CLIENT_ADMIN` of the project's client; `SUPER_ADMIN`           |

`content` is trimmed and must be 1–2000 characters.

### Notification

| Operation                | Arguments        | Returns              | Role                                                                 |
| ------------------------ | ---------------- | -------------------- | -------------------------------------------------------------------- |
| `markAsRead`             | `id: ID!`        | `NotificationType`   | Any authenticated (own notifications only)                           |
| `markAllAsRead`          | —                | `[NotificationType]` | Any authenticated; one write; returns the caller's list              |
| `markNotificationsRead`  | `ids: [ID!]!`    | `[NotificationType]` | Any authenticated; 1–500 ids, one write; other users' ids are ignored |
| `deleteNotification`     | `id: ID!`        | `NotificationType`   | Any authenticated; `SUPER_ADMIN` can delete any                      |
| `deleteAllNotifications` | —                | `[NotificationType]` | Any authenticated                                                    |

The `notifications` query returns the caller's notifications newest first (an empty list if none). `createdAt` is an ISO string.

### Preference

| Operation          | Arguments                                                 | Returns          | Role              |
| ------------------ | --------------------------------------------------------- | ---------------- | ----------------- |
| `updatePreference` | `theme: LIGHT\|DARK, language: ENGLISH\|JAPANESE\|KOREAN` | `PreferenceType` | Any authenticated |

---

## Subscriptions

| Operation             | Arguments | Returns            | Role              | Notes                                                                 |
| --------------------- | --------- | ------------------ | ----------------- | --------------------------------------------------------------------- |
| `notificationCreated` | —         | `NotificationType` | Any authenticated | Filtered per user via Redis PubSub. The token is verified when the socket connects; a missing or invalid token closes it with code 4403. Notifications are delivered by the BullMQ worker (or directly if the queue is down) |

---

## Return Types Reference

| Type                 | Fields                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `UserType`           | `id, name, email, number, role, dob, gender, status (ACTIVE \| LOCKED \| INVITED), lastLoginAt`                 |
| `AuthType`           | `id, email, token, tokenExpiration`                                                                                |
| `ForgotPasswordType` | `message`, `token` (deprecated, always null)                                                                       |
| `MessageType`        | `message`                                                                                                          |
| `ClientType`         | `id, name, email, phone, deleteRequest, assignedAdmin (UserType)`                                                  |
| `ProjectType`        | `id, name, description, status, dueDate, client (ClientType), user ([UserType])`                                   |
| `TaskType`           | `id, title, priority, deadline, currentStatus, createdAt, resolvedAt, subTaskStats { done total }, assignedTo (UserType), createdBy (UserType), project (ProjectType)` |
| `SubTaskType`        | `id, title, priority, deadline, currentStatus, assignedTo (UserType), createdBy (UserType)`                        |
| `CommentType`        | `id, content, taskId, subTaskId, author (UserType), createdAt, updatedAt` (ISO date strings)                       |
| `NotificationType`   | `id, content, status, createdAt, user (UserType)`                                                                  |
| `PreferenceType`     | `id, theme, language, user (UserType)`                                                                             |

---

## Enum Values Reference

GraphQL enum names equal their values (send `"IN_PROGRESS"`, `"URGENT"`, …). The one exception is the `Gender` enum on `register`, which takes `M`, `F` or `O`. Dates (`deadline`, `dueDate`, `createdAt`, `resolvedAt`, `lastLoginAt`) are ISO strings.

| Enum                    | Values                                       |
| ----------------------- | -------------------------------------------- |
| Role                    | `SUPER_ADMIN`, `CLIENT_ADMIN`, `USER`        |
| Project Status          | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`    |
| Task / SubTask Priority | `URGENT`, `HIGH`, `NORMAL`, `BACKLOG`        |
| Task / SubTask Status   | `NEW`, `IN_PROGRESS`, `RESOLVED`, `REOPENED` |
| Notification Status     | `READ`, `UNREAD`                             |
| Theme                   | `LIGHT`, `DARK`                              |
| Language                | `ENGLISH`, `JAPANESE`, `KOREAN`              |
| Gender                  | `MALE`, `FEMALE`, `OTHERS`                   |
