# ProjoMan — Backend Documentation

> A complete guide to the server-side API: how it is built, every endpoint, the rules it enforces, and what the tests verify.

| | |
|---|---|
| **Audience** | Backend engineers and API consumers |
| **Last reviewed** | 2026-10-06 |
| **Related** | [../server/Routes.md](../server/Routes.md) (quick reference) · [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) · [../server/STATUS.md](../server/STATUS.md) · [docs index](README.md) |

---

## Table of Contents

1. [Architecture at a Glance](#1-architecture-at-a-glance)
2. [Project Structure](#2-project-structure)
3. [Getting Started](#3-getting-started)
4. [Environment Variables](#4-environment-variables)
5. [Authentication](#5-authentication)
6. [Role-Based Access Control](#6-role-based-access-control)
7. [Error Handling](#7-error-handling)
8. [Input Validation](#8-input-validation)
9. [Caching](#9-caching)
10. [Data Models](#10-data-models)
11. [API Reference — Queries](#11-api-reference--queries)
12. [API Reference — Mutations](#12-api-reference--mutations)
13. [API Reference — Subscriptions](#13-api-reference--subscriptions)
14. [Notification System](#14-notification-system)
15. [Testing](#15-testing)
16. [Logging and Audit Trail](#16-logging-and-audit-trail)
17. [Metrics](#17-metrics)
18. [Docker](#18-docker)

---

## 1. Architecture at a Glance

Every request travels through four clean layers. Each layer has one job and one job only.

```
HTTP Request (POST /graphql)
       │
       ▼
┌─────────────────────────────────────────────┐
│            Apollo Server (server.js)         │
│  • JWT verification (401 on failure)         │
│  • Rate limiting (development only)          │
│  • Query depth check (max 7)                 │
│  • Builds context { user, reqId, logger }    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│            GraphQL Resolvers                 │
│  • Parse arguments from the GraphQL request  │
│  • Call the matching Service method          │
│  • Return the result (always async/await)    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│            Services (Business Logic)         │
│  • Validate inputs with Zod                  │
│  • Check caller's role (RBAC)                │
│  • Read from / write to Redis cache          │
│  • Call Repository for database access       │
│  • Queue notifications (BullMQ → worker)     │
│  • Write audit logs                          │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│            Repositories (Database Access)    │
│  • All Mongoose queries live here            │
│  • Return plain JS objects (.toObject())     │
│  • No business logic here                    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
              MongoDB
```

**Why this structure?**

- **Resolvers** stay thin — they never contain if/else business rules.
- **Services** are fully unit-testable without a running database (we mock the Repository layer in tests).
- **Repositories** are the only place that knows Mongoose exists — if we ever switched databases, only this layer changes.

Alongside the request path, a separate **notification worker** process consumes the BullMQ queue and pushes notifications to browsers over WebSocket (see [§14](#14-notification-system)). The same port serves `graphql-ws` subscriptions and the `/health/live` and `/health/ready` probes.

---

## 2. Project Structure

```
server/
├── app.js                    # Entry: connects DB, starts metrics server, crash logging, starts Apollo or cluster
├── cluster.js                # Outside dev: forks one worker process per CPU core
├── server.js                 # Apollo Server on Express, buildHttpContext (JWT), Prometheus plugin, health routes
│
├── config/
│   ├── env.js                # Zod env validation — exits on startup if vars are missing
│   ├── db.js                 # MongoDB connection via Mongoose (autoIndex off in production)
│   ├── redis.js              # Redis client with retry strategy
│   ├── cache.js              # Cache helper: get / set / invalidate / invalidatePattern
│   ├── health.js             # Readiness checks for /health/ready
│   ├── logger.js             # Pino logger (with secret redaction)
│   ├── metrics.js            # Prometheus request and cache metric definitions
│   └── pubsub.js             # Redis PubSub for GraphQL subscriptions
│
├── graphql/
│   ├── schema.js             # Root Query, Mutation, Subscription definitions
│   ├── resolvers/            # One resolver file per domain (user, project, client, task, etc.)
│   └── types/                # GraphQL type definitions (UserType, TaskType, etc.)
│
├── services/                 # All business logic (one file per domain, incl. comment) + email.service.js (Bird: reset + invite)
├── repositories/             # All Mongoose access (one file per domain)
├── models/                   # Mongoose schema definitions (8 models + barrel)
│
├── queues/
│   └── notification.queue.js # BullMQ queue, created lazily by getNotificationQueue()
├── worker/
│   └── notification.worker.js# Worker process: runs NotificationService.deliver() for each queued job
│
├── validation/
│   ├── schema.js             # All Zod schemas
│   └── validate.js           # validate() helper — throws ValidationError on failure
│
├── errors/
│   ├── AppError.js           # Base error class
│   └── errors.js             # NotFoundError, ForbiddenError, UnauthorizedError, etc.
│
├── middleware/
│   └── rateLimiter.js        # In-memory per-IP, per-operation limiter (100/min; development only)
│
├── scripts/
│   └── sync-indexes.js       # Deploy-time index sync (npm run db:indexes[:prod], --dry-run)
├── tests/                    # Jest unit tests: 12 suites (one per domain + userAdmin, server, indexes, graphqlTypes), 386 tests
├── prometheus/               # Scrape config + alert rules (dev stack)
└── grafana/                  # Provisioned data source + "ProjoMan API" dashboard
```

---

## 3. Getting Started

All commands are run from inside the `server/` directory.

```bash
# Install dependencies
npm install

# Development — uses .env.local, hot-reload via nodemon
npm run dev

# Production — uses .env.prod
npm run start

# Run all tests (watch mode)
npm test

# Run tests for a specific domain
npm run test:auth
npm run test:client
npm run test:project
npm run test:task
npm run test:subTask
npm run test:notification
npm run test:preference
npm run test:comment
npm run test:userAdmin
npm run test:server

# Apply schema indexes to the database (production: db:indexes:prod); add `-- --dry-run` to preview
npm run db:indexes

# Notification worker (separate process; needs Redis)
npx env-cmd -f .env.local node worker/notification.worker.js

# Run a single test by its name
node --experimental-vm-modules node_modules/.bin/jest tests/task.test.js --verbose -t "should create a task"
```

> **Note:** `--experimental-vm-modules` is required because the project uses ES Modules (`"type": "module"` in package.json). Jest's native ESM support still requires this flag.

---

## 4. Environment Variables

Variables are validated at startup by Zod (`config/env.js`). If any required variable is missing or invalid, the server exits immediately with a clear message rather than crashing later with a confusing error.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Must be `development`, `production`, or `test` |
| `PORT` | No | `8000` | Port the GraphQL API listens on |
| `MONGO_URI` | **Yes** | — | Full MongoDB connection string |
| `SECRET_KEY` | **Yes** | — | JWT signing secret — **minimum 32 characters** |
| `REDIS_HOST` | No | `localhost` | Redis server hostname |
| `REDIS_PORT` | No | `6379` | Redis server port |
| `REDIS_PASSWORD` | No | — | Redis password (if auth is enabled) |
| `CORS_ORIGIN` | No | `*` | Allowed CORS origin |
| `METRICS_PORT` | No | `9090` | Port of the Prometheus metrics server |
| `BIRD_API_KEY` | No | — | Bird API key for password-reset and invite emails; without it no email is sent |
| `EMAIL_FROM` | No | `onboarding@messagebird.dev` | Sender address (Bird's test sender by default) |
| `APP_URL` | No | `http://localhost:4000` | Frontend base URL used to build reset and invite links |

Only `NODE_ENV`, `PORT`, `MONGO_URI` and `SECRET_KEY` are checked by Zod; the rest are read directly from `process.env`. Copy `server/.env.example` to `.env.local` / `.env.prod`. These files are git-ignored and must never be committed.

---

## 5. Authentication

**How it works:**

1. The user calls the `login` mutation with their email and password.
2. The server verifies the password and returns a **JWT (JSON Web Token)** that expires in **1 hour**.
3. Every subsequent request must include this token in the HTTP `Authorization` header:
   ```
   Authorization: Bearer <token>
   ```
4. Apollo Server extracts and verifies this token before the request reaches any resolver. The decoded user object (`{ id, email, role }`) is attached to the GraphQL context.

**Public operations** — these four operations bypass JWT verification entirely:

| Operation Name | Why it is public |
|---|---|
| `LoginMutation` | You need to log in before you have a token |
| `RegisterMutation` | New users do not have a token yet |
| `ForgotPasswordMutation` | Users cannot log in if they forgot their password |
| `ResetPasswordMutation` | Used with a reset token, not a JWT |

All other operations require a valid, non-expired JWT. Requests without a valid token receive an `UNAUTHORIZED` error with HTTP status 401.

**Account lockout:**

After **5 consecutive failed login attempts**, the account is locked for **1 hour**. This prevents brute-force password attacks. The lockout resets automatically after the time window passes, or immediately upon a successful login.

**Password reset flow:**

1. Call `forgotPassword(email)` — if the account exists, the server generates a random 32-byte token that expires in 1 hour, stores only its SHA-256 hash, and emails a link (`APP_URL/reset-password?token=...`) through Bird. The response is the same whether or not the account exists, and never contains the token.
2. Call `resetPassword(token, password)` with the token from the link — the server hashes it, finds the matching user, updates the password (bcrypt), and clears the reset token, `invitedAt` and all previous login failure counts.

**Invites:** `createUser` in `INVITE` mode creates the account without a usable password and emails a link to the same reset page, valid for **48 hours** (`resendInvite` issues a new one). Accepting it is a normal `resetPassword`.

**Changing your own password:** `changePassword(currentPassword, newPassword)` — the current password must match.

**Sign-in tracking:** a successful login sets `lastLoginAt`. The user `status` field is derived: `LOCKED` while a lockout is active, `INVITED` while an invite is outstanding, otherwise `ACTIVE`.

**WebSocket auth:** subscriptions send the token as `connectionParams.authorization` (`Bearer <token>`). It is checked once when the socket connects; a missing or invalid token closes the socket with code **4403**.

---

## 6. Role-Based Access Control

There are three roles. Every service method checks the caller's role and throws a `ForbiddenError` if they are not allowed. This check happens on the server — it cannot be bypassed.

### SUPER_ADMIN
- Full access to everything across all clients.
- Can create, read, update, and delete any data in the system.
- Can invite users by email or create them with a temporary password (`createUser`), edit them (`updateUser`), resend invites, and unlock locked accounts (`unlockUsers`).
- Can change roles in bulk (`changeUserRoles`); at least one `SUPER_ADMIN` must remain, and a new `CLIENT_ADMIN` needs exactly one person and a client without an admin.
- Can promote a `USER` to `CLIENT_ADMIN`.
- Can delete any user except themselves (`deleteUser`, or `deleteUsers` in bulk); the user is removed from their tasks, sub-tasks, projects and any client they administer.
- Can assign a `CLIENT_ADMIN` to a client.
- Can approve a client deletion request (`deleteClientBySuperAdmin`), decline it with a message (`declineClientDeletion`), or force-delete a client.
- Sees all users, all clients, all projects, all tasks.

### CLIENT_ADMIN
- Scoped to their assigned client.
- Can manage projects that belong to their client.
- Can add and remove users from those projects.
- Can create, update, and delete tasks within their projects.
- Can see users who are assigned to their projects.
- Can update their own client's details.
- Can request their client for deletion (`confirmDeleteClient` sets a flag for SUPER_ADMIN to approve or decline).
- Can delete any comment in their client's projects.
- Cannot change another client's data.

> **Known gap (S-2 in `server/STATUS.md`):** the read paths `tasks`, `task`, `subTasks` and `subTask` don't yet check that a `CLIENT_ADMIN` owns the project's client. Comments and `allTasks` do.

### USER
- The most restricted role.
- Sees only projects they have been explicitly added to.
- Can view tasks within those projects.
- Can update status and details of tasks assigned specifically to them.
- Can create sub-tasks on tasks they are assigned to.
- Can update and resolve sub-tasks assigned to them.
- Can delete sub-tasks they created.
- Can comment on tasks and sub-tasks in their projects, and edit or delete their own comments.
- Cannot create top-level tasks, create projects, manage clients, or see other users.

---

## 7. Error Handling

All errors thrown in services extend a common `AppError` base class. Apollo Server's `formatError` hook catches these and returns a structured JSON response.

**Error response format:**

```json
{
  "errors": [
    {
      "message": "Resource not found",
      "extensions": {
        "code": "NOT_FOUND",
        "statusCode": 404
      }
    }
  ]
}
```

**Error types:**

| Class | Code | HTTP Status | When Used |
|---|---|---|---|
| `NotFoundError` | `NOT_FOUND` | 404 | Requested record does not exist |
| `UnauthorizedError` | `UNAUTHORIZED` | 401 | No valid JWT, or expired reset token |
| `ForbiddenError` | `FORBIDDEN` | 403 | JWT valid but role is not allowed |
| `ValidationError` | `VALIDATION_ERROR` | 400 | Zod validation failed — bad input |
| `ConflictError` | `CONFLICT` | 409 | Duplicate — e.g., email already exists |

---

## 8. Input Validation

Every mutation input is validated using a **Zod schema** before any business logic runs. If validation fails, a `ValidationError` is thrown immediately.

**Examples of what is validated:**

- MongoDB IDs must match the exact 24-character hex format.
- Email addresses must be valid format.
- Passwords must be at least 8 characters.
- Names must be between 1 and 100 characters.
- Enum fields (role, status, priority, theme, language) must be one of the allowed values. GraphQL enum names equal their values, so clients send `"IN_PROGRESS"`, `"URGENT"` and so on. The one exception is `Gender` on `register`, which takes `M` / `F` / `O`.
- Required fields are present.
- Optional fields are the correct type when provided.

---

## 9. Caching

Frequently read data is cached in Redis with a **5-minute TTL (time to live)**. On a cache hit, the response is returned without touching MongoDB. On a cache miss, the database is queried and the result is stored in the cache.

Cache is always invalidated (deleted) when the underlying data changes.

**Cache keys:**

| Data | Key Pattern |
|---|---|
| All users | `users:all` |
| A single user | `users:{userId}` |
| All clients | `clients:all` |
| A single client | `clients:{clientId}` |
| User's preference | `preference:{userId}` |

**Important note:** If Redis is unavailable, the cache methods fail silently. The application falls back to reading directly from MongoDB. This means Redis is a performance enhancement, not a hard dependency at runtime.

---

## 10. Data Models

Indexes are declared in each schema and listed with the query they serve in [`SYSTEM_DESIGN.md` §7](SYSTEM_DESIGN.md#7-database-design--indexing). In production they are applied by `npm run db:indexes:prod`, not at startup.

### User

Represents a person who has an account in the system.

| Field | Type | Notes |
|---|---|---|
| `id` | ObjectId | Auto-generated primary key |
| `name` | String | Required |
| `email` | String | Required, unique, lowercase |
| `password` | String | Required, stored as bcrypt hash |
| `role` | Enum | `SUPER_ADMIN` / `CLIENT_ADMIN` / `USER` — default: `USER` |
| `number` | String | Phone number |
| `gender` | Enum | `MALE` / `FEMALE` / `OTHERS` |
| `dob` | Date | Date of birth |
| `loginAttempts` | Number | Incremented on failed login — default: 0 |
| `lastFailedLogin` | Date | Timestamp of most recent failed login |
| `resetToken` | String | Temporary password reset token (nullable) |
| `resetTokenExpiry` | Date | When the reset token expires (nullable) |
| `lastLoginAt` | Date | Set on each successful login (nullable) |
| `invitedAt` | Date | Set when invited by `createUser`; cleared once the invite is accepted (nullable) |
| `createdAt` / `updatedAt` | Date | Auto-managed by Mongoose |

The GraphQL `User` type also exposes a derived `status`: `LOCKED` (lockout active), `INVITED` (invite outstanding) or `ACTIVE`. `dob` is optional.

---

### Client

Represents a company using the platform.

| Field | Type | Notes |
|---|---|---|
| `id` | ObjectId | Auto-generated |
| `name` | String | Company name |
| `email` | String | Contact email, optional, stored lowercase; must be unique when given (checked by the service) |
| `phone` | String | Contact phone, optional |
| `assignedAdmin` | ObjectId (ref: User) | The CLIENT_ADMIN managing this client (nullable) |
| `deleteRequest` | Boolean | Set to `true` when CLIENT_ADMIN requests deletion — default: `false` |
| `createdAt` / `updatedAt` | Date | Auto-managed |

---

### Project

Represents a project belonging to a client.

| Field | Type | Notes |
|---|---|---|
| `id` | ObjectId | Auto-generated |
| `name` | String | Project name |
| `description` | String | Project description |
| `status` | Enum | `NOT_STARTED` / `IN_PROGRESS` / `COMPLETED` — default: `NOT_STARTED` |
| `clientId` | ObjectId (ref: Client) | Which company this project belongs to |
| `assignedUsers` | [ObjectId] (ref: User) | List of users added to this project |
| `dueDate` | Date | Optional target date (nullable) |
| `createdAt` / `updatedAt` | Date | Auto-managed |

> **Important:** The database field is `assignedUsers` (plural). The GraphQL API exposes this as `user` (singular field name, but returns an array). Always use `assignedUsers` when working with the model directly.

---

### Task

Represents a specific job within a project.

| Field | Type | Notes |
|---|---|---|
| `id` | ObjectId | Auto-generated |
| `title` | String | Task name |
| `priority` | Enum | `URGENT` / `HIGH` / `NORMAL` / `BACKLOG` — default: `NORMAL` |
| `deadline` | Date | Optional due date |
| `currentStatus` | Enum | `NEW` / `IN_PROGRESS` / `RESOLVED` / `REOPENED` — default: `NEW` |
| `assignedTo` | ObjectId (ref: User) | The user this task is assigned to (nullable) |
| `createdBy` | ObjectId (ref: User) | Who created this task |
| `project` | ObjectId (ref: Project) | Which project this task belongs to |
| `resolvedAt` | Date | Set when the status becomes `RESOLVED`, cleared otherwise (nullable) |
| `createdAt` / `updatedAt` | Date | Auto-managed |

The GraphQL `Task` type adds `subTaskStats { done, total }` and returns `deadline`, `createdAt` and `resolvedAt` as ISO strings. `deadline` and `assignedTo` can be cleared by sending `null`.

---

### SubTask

Represents a smaller step within a task. Structurally identical to a Task but belongs to a Task instead of a Project.

| Field | Type | Notes |
|---|---|---|
| `id` | ObjectId | Auto-generated |
| `title` | String | Sub-task name |
| `priority` | Enum | `URGENT` / `HIGH` / `NORMAL` / `BACKLOG` — default: `NORMAL` |
| `deadline` | Date | Optional due date |
| `currentStatus` | Enum | `NEW` / `IN_PROGRESS` / `RESOLVED` / `REOPENED` — default: `NEW` |
| `assignedTo` | ObjectId (ref: User) | Who this sub-task is assigned to (nullable) |
| `createdBy` | ObjectId (ref: User) | Who created this sub-task |
| `task` | ObjectId (ref: Task) | Which task this sub-task belongs to |
| `createdAt` / `updatedAt` | Date | Auto-managed |

---

### Notification

An in-app message delivered to a specific user.

| Field | Type | Notes |
|---|---|---|
| `id` | ObjectId | Auto-generated |
| `user` | ObjectId (ref: User) | Who this notification belongs to |
| `content` | String | The message text |
| `status` | Enum | `READ` / `UNREAD` — default: `UNREAD` |
| `createdAt` / `updatedAt` | Date | Auto-managed |

---

### Preference

Stores a user's personal settings. One per user, created automatically at registration.

| Field | Type | Notes |
|---|---|---|
| `id` | ObjectId | Auto-generated |
| `user` | ObjectId (ref: User) | The user this preference belongs to (unique) |
| `theme` | Enum | `LIGHT` / `DARK` — default: `LIGHT` |
| `language` | Enum | `ENGLISH` / `JAPANESE` / `KOREAN` — default: `ENGLISH` |
| `createdAt` / `updatedAt` | Date | Auto-managed |

---

### Comment

A comment on a task or sub-task. A sub-task comment stores both its `subTaskId` and the parent `taskId`; `taskComments` returns only comments without a `subTaskId`. Deleting a task or sub-task deletes its comments.

| Field | Type | Notes |
|---|---|---|
| `id` | ObjectId | Auto-generated |
| `content` | String | The comment text |
| `userId` | ObjectId (ref: User) | Who wrote the comment |
| `taskId` | ObjectId (ref: Task) | Which task this comment is on |
| `subTaskId` | ObjectId (ref: SubTask) | Which sub-task (optional) |
| `content` rules | — | Trimmed, 1–2000 characters |
| `createdAt` / `updatedAt` | Date | Auto-managed |

---

## 11. API Reference — Queries

All queries are sent as GraphQL POST requests to `/graphql`.

---

### `profile`

Returns the profile of the currently logged-in user.

**Who can call it:** Any authenticated user.

**Arguments:** None.

**Returns:** `UserType`

**Example:**
```graphql
query GetProfile {
  profile {
    id
    name
    email
    number
    role
    dob
    gender
  }
}
```

---

### `users`

Returns a list of users.

**Who can call it:**
- `SUPER_ADMIN` — returns all users in the system.
- `CLIENT_ADMIN` — returns only users who are assigned to projects belonging to their client.
- `USER` — **forbidden**.

**Arguments:** None.

**Returns:** `[UserType]`

**Caching:** SUPER_ADMIN result cached for 5 minutes (`users:all`).

**Example:**
```graphql
query GetUsers {
  users {
    id
    name
    email
    role
    number
    gender
    dob
  }
}
```

---

### `user(id)`

Returns a single user by ID.

**Who can call it:**
- `SUPER_ADMIN` — any user.
- `CLIENT_ADMIN` — only users in their projects.
- `USER` — **forbidden**.

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `id` | ID | Yes | The user's ID |

**Returns:** `UserType`

**Caching:** SUPER_ADMIN result cached (`users:{id}`).

---

### `clients`

Returns all clients (companies).

**Who can call it:** `SUPER_ADMIN` only.

**Arguments:** None.

**Returns:** `[ClientType]`

**Caching:** Cached for 5 minutes (`clients:all`).

**Example:**
```graphql
query GetClients {
  clients {
    id
    name
    email
    phone
    deleteRequest
    assignedAdmin {
      id
      name
      email
    }
  }
}
```

---

### `client(id)`

Returns a single client by ID.

**Who can call it:**
- `SUPER_ADMIN` — any client.
- `CLIENT_ADMIN` — only their assigned client.
- `USER` — **forbidden**.

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `id` | ID | Yes | The client's ID |

**Returns:** `ClientType`

**Caching:** Cached (`clients:{id}`).

---

### `projects`

Returns projects visible to the caller.

**Who can call it:**
- `SUPER_ADMIN` — all projects.
- `CLIENT_ADMIN` — only projects belonging to their client.
- `USER` — only projects they have been added to.

**Arguments:** None.

**Returns:** `[ProjectType]`

**Example:**
```graphql
query GetProjects {
  projects {
    id
    name
    description
    status
    client { id name }
    user { id name email }
  }
}
```

---

### `project(id)`

Returns a single project by ID.

**Who can call it:** Same rules as `projects` but for a specific record. Returns `ForbiddenError` if the caller is not allowed to see this project.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | ID | Yes |

**Returns:** `ProjectType`

---

### `tasks(projectId)`

Returns all tasks for a given project.

**Who can call it:**
- `SUPER_ADMIN`, `CLIENT_ADMIN` — all tasks in the project.
- `USER` — only if they are assigned to the project.

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `projectId` | ID | Yes | The project to fetch tasks for |

**Returns:** `[TaskType]`

**Example:**
```graphql
query GetTasks($projectId: ID!) {
  tasks(projectId: $projectId) {
    id
    title
    priority
    deadline
    currentStatus
    assignedTo { id name email }
    createdBy { id name email }
    project { id name }
  }
}
```

---

### `task(id)`

Returns a single task by ID.

**Who can call it:**
- `SUPER_ADMIN`, `CLIENT_ADMIN` — any task.
- `USER` — only if the task is assigned to them or they created it.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | ID | Yes |

**Returns:** `TaskType`

---

### `subTasks(taskId)`

Returns all sub-tasks for a given task.

**Who can call it:**
- `SUPER_ADMIN`, `CLIENT_ADMIN` — all sub-tasks.
- `USER` — only if they are the assignee or creator of the parent task.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `taskId` | ID | Yes |

**Returns:** `[SubTaskType]`

---

### `subTask(id)`

Returns a single sub-task by ID.

**Who can call it:**
- `SUPER_ADMIN` — any sub-task.
- `USER` — only if assigned to them or created by them.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | ID | Yes |

**Returns:** `SubTaskType`

---

### `allTasks`

Returns every task the caller can see, across all their projects. The dashboards and the Tasks board use it.

**Who can call it:**
- `SUPER_ADMIN` — every task.
- `CLIENT_ADMIN` — tasks in their client's projects.
- `USER` — tasks in projects they are assigned to.

**Arguments:** None.

**Returns:** `[TaskType]`, including `createdAt`, `resolvedAt` and `subTaskStats { done total }`.

---

### `taskComments(taskId)`

Returns a task's own comments, oldest first. Comments made on its sub-tasks are not included.

**Who can call it:** Project members — a `USER` assigned to the project, the `CLIENT_ADMIN` of the project's client, or any `SUPER_ADMIN`.

| Argument | Type | Required |
|---|---|---|
| `taskId` | ID | Yes |

**Returns:** `[CommentType]` (`id`, `content`, `user`, `createdAt`, `updatedAt`)

---

### `subTaskComments(subTaskId)`

Returns a sub-task's comments, oldest first. Same access rule as `taskComments`.

| Argument | Type | Required |
|---|---|---|
| `subTaskId` | ID | Yes |

**Returns:** `[CommentType]`

---

### `notifications`

Returns all notifications for the currently logged-in user, newest first. Returns an empty list (not an error) when there are none. `createdAt` is an ISO string.

**Who can call it:** Any authenticated user (own notifications only).

**Arguments:** None.

**Returns:** `[NotificationType]`

**Example:**
```graphql
query GetNotifications {
  notifications {
    id
    content
    status
    createdAt
  }
}
```

---

### `notification(id)`

Returns a single notification by ID. Users can only access their own notifications.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | ID | Yes |

**Returns:** `NotificationType`

---

### `preference`

Returns the preference settings for the currently logged-in user.

**Who can call it:** Any authenticated user (own preference only).

**Arguments:** None.

**Returns:** `PreferenceType`

**Example:**
```graphql
query GetPreference {
  preference {
    theme
    language
  }
}
```

---

## 12. API Reference — Mutations

---

### `login(email, password)`

Authenticates a user and returns a JWT token.

**Who can call it:** Anyone (public — no JWT required).

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `email` | String | Yes | User's email address |
| `password` | String | Yes | User's plain-text password |

**Returns:** `AuthType` — `{ id, email, token, tokenExpiration }`

**Behaviour:**
- Checks if the account is locked (5+ failed attempts within the last hour).
- If locked, returns `UnauthorizedError` with the time remaining.
- Verifies the password against the bcrypt hash.
- On success: resets `loginAttempts` to 0, returns a JWT valid for 1 hour.
- On failure: increments `loginAttempts`, records `lastFailedLogin`.
- An unknown email and a wrong password return the same error, so login can't be used to find out which emails have accounts.

**Errors:**
- `UNAUTHORIZED` — "Invalid email or password" (unknown email or wrong password), or account locked.
- `VALIDATION_ERROR` — missing email or password.

---

### `register(name, email, password, number, dob, gender)`

Creates a new user account.

**Who can call it:** Anyone (public — no JWT required).

**Arguments:**

| Argument | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | String | Yes | — | Full name (1–100 chars) |
| `email` | String | Yes | — | Valid email address |
| `password` | String | Yes | — | Min 8 characters |
| `number` | String | Yes | — | Phone number |
| `dob` | String | Yes | — | Date of birth |
| `gender` | Enum | Yes | — | `M` / `F` / `O` (stored as `MALE` / `FEMALE` / `OTHERS`) |

There is no `role` argument: public sign-up always creates a `USER`. Admins are created with `promoteToAdmin` / `assignAdmin`.

**Returns:** `UserType`

**Behaviour:**
- Checks that the email is not already registered.
- Hashes the password with bcrypt (10 rounds).
- Creates the user.
- Creates a default `Preference` record (`LIGHT` theme, `ENGLISH` language).
- If preference creation fails, the user record is deleted (rollback) and an error is returned.

**Errors:**
- `CONFLICT` — email already registered.
- `VALIDATION_ERROR` — invalid input.

---

### `forgotPassword(email)`

Emails a password reset link.

**Who can call it:** Anyone (public).

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `email` | String | Yes |

**Returns:** `ForgotPasswordType` — `{ message, token }`, where `token` is always `null` (deprecated field)

**Behaviour:**
- Looks up the user by email.
- If found: generates a cryptographically random 32-byte hex token, stores its SHA-256 hash with a 1-hour expiry, and emails `APP_URL/reset-password?token=<token>` via Bird (`services/email.service.js`). The email is sent in the background, so a Bird failure is logged but doesn't change the response.
- Always returns the same message: "If an account exists for this email, a password reset link has been sent."

**Errors:**
- `VALIDATION_ERROR` — invalid email format. (An unknown email is not an error.)

---

### `resetPassword(token, password)`

Sets a new password using a reset token.

**Who can call it:** Anyone (public).

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `token` | String | Yes | The token from the emailed reset link |
| `password` | String | Yes | New password (min 8 characters) |

**Returns:** `MessageType` — `{ message: "Password reset successful." }`

**Behaviour:**
- Hashes the token and looks up the user with that `resetToken` hash.
- Checks that the token has not expired.
- Hashes the new password.
- Clears `resetToken`, `resetTokenExpiry`, and `loginAttempts`.

**Errors:**
- `NOT_FOUND` — no user has this token.
- `UNAUTHORIZED` — the token has expired.

---

### `updateProfile(name?, number?, dob?, gender?)`

Updates the logged-in user's own profile details.

**Who can call it:** Any authenticated user.

**Arguments:** All are optional. Only provided fields are updated.

| Argument | Type | Description |
|---|---|---|
| `name` | String | New display name |
| `number` | String | New phone number |
| `dob` | String | New date of birth |
| `gender` | Enum | `MALE` / `FEMALE` / `OTHERS` |

**Returns:** `UserType`

**Side effects:** Invalidates the user's cache entry.

---

### `promoteToAdmin(userId)`

Promotes a `USER` to `CLIENT_ADMIN`.

**Who can call it:** `SUPER_ADMIN` only.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `userId` | ID | Yes |

**Returns:** `UserType` (the promoted user)

**Behaviour:**
- Throws `ConflictError` if the user is already `CLIENT_ADMIN` or `SUPER_ADMIN`.
- Updates role to `CLIENT_ADMIN`.
- Sends a notification to the promoted user: *"You have been promoted to Client Admin."*
- Logs an audit event.

**Errors:**
- `FORBIDDEN` — caller is not SUPER_ADMIN.
- `CONFLICT` — user is already an admin.
- `NOT_FOUND` — user does not exist.

---

### `deleteUser(userId)`

Permanently deletes a user.

**Who can call it:** `SUPER_ADMIN` only.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `userId` | ID | Yes |

**Returns:** `UserType` (the deleted user)

**Behaviour:**
- SUPER_ADMIN cannot delete themselves.
- Unassigns the user from their tasks and sub-tasks, removes them from every project team, and frees any client they administered.
- Logs an audit event.

**Errors:**
- `FORBIDDEN` — caller is not SUPER_ADMIN, or is trying to delete themselves.
- `NOT_FOUND` — user does not exist.

---

### `changePassword(currentPassword, newPassword)`

Changes the caller's own password.

**Who can call it:** Any authenticated user.

| Argument | Type | Required | Description |
|---|---|---|---|
| `currentPassword` | String | Yes | Must match the current password |
| `newPassword` | String | Yes | At least 8 characters |

**Returns:** `MessageType` — `"Password changed"`

**Errors:** `VALIDATION_ERROR` — "Current password is incorrect", or the new password is too short.

---

### `createUser(name, email, number, gender, dob?, role?, clientId?, mode, password?)`

Creates a user on someone's behalf.

**Who can call it:** `SUPER_ADMIN` only.

| Argument | Type | Required | Description |
|---|---|---|---|
| `name`, `email`, `number`, `gender` | String | Yes | As for `register` |
| `dob` | String | No | Date of birth |
| `role` | Role | No | Default `USER` |
| `clientId` | ID | When `role` is `CLIENT_ADMIN` | A client that has no admin yet |
| `mode` | `"INVITE"` \| `"PASSWORD"` | Yes | `INVITE` emails a link to set a password (valid 48 hours); `PASSWORD` sets a temporary password |
| `password` | String | When `mode` is `PASSWORD` | At least 8 characters |

**Returns:** `UserType` (`status` is `INVITED` for invites)

**Errors:**
- `FORBIDDEN` — the caller is not a SUPER_ADMIN.
- `CONFLICT` — the email is taken, or the client already has an admin.
- `NOT_FOUND` — the client doesn't exist.
- `VALIDATION_ERROR` — "Pick the client they'll manage", or the password is too short.

---

### `updateUser(id, name?, email?, number?, gender?, dob?)`

Edits another user's details. **SUPER_ADMIN only.**

**Returns:** `UserType`. **Errors:** `NOT_FOUND`; `CONFLICT` if the new email belongs to someone else.

---

### `changeUserRoles(ids, role, clientId?)`

Sets one role for several users at once. **SUPER_ADMIN only.**

**Behaviour:**
- A new `CLIENT_ADMIN` needs exactly one id and a `clientId` for a client without an admin.
- At least one `SUPER_ADMIN` must remain.
- Former client admins are detached from their client.
- Each user whose role changed is notified.

**Returns:** `[UserType]`.

**Errors:**
- `NOT_FOUND` — an id doesn't exist.
- `CONFLICT` — the last super admin would be removed, or the client already has an admin.
- `VALIDATION_ERROR` — "A client admin needs exactly one person and a client".

---

### `unlockUsers(ids)`

Clears failed sign-in attempts so locked users can sign in again. **SUPER_ADMIN only.** **Returns:** `[UserType]`.

---

### `resendInvite(id)`

Emails a fresh 48-hour invite link. **SUPER_ADMIN only.** **Returns:** `MessageType` — `"Invite sent to {email}"`.

**Errors:** `CONFLICT` — "This user has already signed in".

---

### `deleteUsers(ids)`

Deletes several users at once, with the same cleanup as `deleteUser`. **SUPER_ADMIN only.**

**Returns:** `[UserType]`.

**Errors:**
- `FORBIDDEN` — your own id is in the list.
- `NOT_FOUND` — an id doesn't exist.

Nothing is deleted if either check fails.

---

### `addClient(name, email, phone, assignedAdmin?)`

Creates a new client (company).

**Who can call it:** `SUPER_ADMIN` only.

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Company name |
| `email` | String | No | Contact email |
| `phone` | String | No | Contact phone |
| `assignedAdmin` | ID | No | ID of a CLIENT_ADMIN user to assign immediately |

**Returns:** `ClientType`

**Behaviour:**
- If `assignedAdmin` is provided: the user must have role `CLIENT_ADMIN` and must not already be assigned to another client.

---

### `updateClient(id, name, email, phone, assignedAdmin?, deleteRequest?)`

Updates an existing client.

**Who can call it:**
- `SUPER_ADMIN` — any client.
- `CLIENT_ADMIN` — only their assigned client.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | ID | Yes |
| `name` | String | Yes |
| `email` | String | Yes |
| `phone` | String | No |
| `assignedAdmin` | ID | No |
| `deleteRequest` | Boolean | No |

**Returns:** `ClientType`

---

### `assignAdmin(id, assignedAdmin)`

Assigns a CLIENT_ADMIN to a client.

**Who can call it:** `SUPER_ADMIN` only.

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `id` | ID | Yes | The client's ID |
| `assignedAdmin` | ID | Yes | ID of the CLIENT_ADMIN to assign |

**Returns:** `ClientType`

**Behaviour:**
- The user must have role `CLIENT_ADMIN`.
- Throws `ConflictError` if the user is already assigned to a different client.
- Notifies the admin: *"You have been assigned as admin for client "{name}"."*

---

### `confirmDeleteClient(id)`

Marks a client for deletion (sets `deleteRequest: true`).

**Who can call it:** `CLIENT_ADMIN` only (for their own client).

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | ID | Yes |

**Returns:** `ClientType`

**Behaviour:** A SUPER_ADMIN must then call `deleteClientBySuperAdmin` to actually delete the record.

---

### `deleteClientBySuperAdmin(id)`

Deletes a client that has been flagged for deletion.

**Who can call it:** `SUPER_ADMIN` only.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | ID | Yes |

**Returns:** `ClientType`

**Behaviour:** Requires `deleteRequest: true`. Throws `ConflictError` if the flag is not set.

---

### `forceDeleteClient(id)`

Deletes a client immediately, regardless of the `deleteRequest` flag.

**Who can call it:** `SUPER_ADMIN` only.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | ID | Yes |

**Returns:** `ClientType`

---

### `declineClientDeletion(id, message?)`

Rejects a client admin's deletion request.

**Who can call it:** `SUPER_ADMIN` only.

| Argument | Type | Required | Description |
|---|---|---|---|
| `id` | ID | Yes | The client |
| `message` | String | No | Up to 500 characters, included in the client admin's notification |

**Returns:** `ClientType` with `deleteRequest: false`

**Errors:** `NOT_FOUND`, or a `CONFLICT` if no deletion was requested.

---

### `addProject(name, clientId, description?, status?, dueDate?)`

Creates a new project.

**Who can call it:** `SUPER_ADMIN`, `CLIENT_ADMIN`.

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Project name |
| `clientId` | ID | Yes | Client the project belongs to |
| `description` | String | No | Max 500 characters |
| `status` | Enum | No | `NOT_STARTED` (default) / `IN_PROGRESS` / `COMPLETED` |
| `dueDate` | String | No | Target date; `null` clears it |

**Returns:** `ProjectType`

**Behaviour:** CLIENT_ADMIN can only create projects for their assigned client.

---

### `updateProject(id, name?, description?, status?, dueDate?)`

Updates a project's details.

**Who can call it:** `SUPER_ADMIN`, `CLIENT_ADMIN` (own client's projects).

**Arguments:** All except `id` are optional.

**Returns:** `ProjectType`

---

### `deleteProject(id)`

Permanently deletes a project.

**Who can call it:** `SUPER_ADMIN`, `CLIENT_ADMIN` (own client's projects).

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | ID | Yes |

**Returns:** `ProjectType`

---

### `addUserToProject(id, users)`

Adds one or more users to a project.

**Who can call it:** `SUPER_ADMIN`, `CLIENT_ADMIN`.

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `id` | ID | Yes | The project's ID |
| `users` | [ID] | Yes | Array of user IDs to add (minimum 1) |

**Returns:** `ProjectType`

**Behaviour:**
- Validates all provided user IDs exist.
- Skips users already in the project (no duplicate assignment).
- Notifies each newly added user: *"You have been added to project "{name}"."*

---

### `removeUserFromProject(id, users)`

Removes one or more users from a project.

**Who can call it:** `SUPER_ADMIN`, `CLIENT_ADMIN`.

**Arguments:**

| Argument | Type | Required |
|---|---|---|
| `id` | ID | Yes |
| `users` | [ID] | Yes |

**Returns:** `ProjectType`

**Errors:** `CONFLICT` — none of the provided users are currently assigned.

---

### `createTask(title, projectId, assignedTo?, deadline?, priority?, currentStatus?)`

Creates a new task within a project.

**Who can call it:** `SUPER_ADMIN`, `CLIENT_ADMIN`. `USER` is **forbidden**.

**Arguments:**

| Argument | Type | Required | Default |
|---|---|---|---|
| `title` | String | Yes | — |
| `projectId` | ID | Yes | — |
| `assignedTo` | ID | No | — |
| `deadline` | String | No | — |
| `priority` | Enum | No | `NORMAL` |
| `currentStatus` | `NEW` / `IN_PROGRESS` | No | `NEW` |

**Returns:** `TaskType`

**Behaviour:** If `assignedTo` is provided, the assigned user receives a notification: *"You have been assigned a new task: {title}."*

---

### `updateTask(id, title?, assignedTo?, deadline?, priority?)`

Updates a task.

**Who can call it:**
- `SUPER_ADMIN`, `CLIENT_ADMIN` — any task.
- `USER` — only tasks assigned to them.

**Returns:** `TaskType`

**Behaviour:** If the task is being reassigned, the new assignee receives a notification.

---

### `updateTaskStatus(id, status)`

Changes the status of a task.

**Who can call it:**
- `SUPER_ADMIN`, `CLIENT_ADMIN` — any task.
- `USER` — only tasks assigned to them.

**Arguments:**

| Argument | Type | Required | Allowed Values |
|---|---|---|---|
| `id` | ID | Yes | — |
| `status` | Enum | Yes | `NEW` / `IN_PROGRESS` / `RESOLVED` / `REOPENED` |

**Returns:** `TaskType`

**Behaviour:**
- If status is `RESOLVED`: notifies creator ("Task resolved") and assignee if different.
- If status is `REOPENED`: notifies creator ("Task reopened").

---

### `deleteTask(id)`

Permanently deletes a task and all its sub-tasks.

**Who can call it:** `SUPER_ADMIN`, `CLIENT_ADMIN`. `USER` is **forbidden**.

**Behaviour:**
- Deletes all associated sub-tasks first.
- Notifies the assignee (if any): *"Task "{title}" has been deleted."*

---

### `createSubTask(title, taskId, assignedTo?, deadline?, priority?)`

Creates a sub-task under a task.

**Who can call it:**
- `SUPER_ADMIN`, `CLIENT_ADMIN` — any task.
- `USER` — only if they are assigned to the parent task.

**Arguments:**

| Argument | Type | Required | Default |
|---|---|---|---|
| `title` | String | Yes | — |
| `taskId` | ID | Yes | — |
| `assignedTo` | ID | No | — |
| `deadline` | String | No | — |
| `priority` | Enum | No | `NORMAL` |

**Returns:** `SubTaskType`

---

### `updateSubTask(id, title?, assignedTo?, deadline?, priority?)`

Updates a sub-task.

**Who can call it:**
- `SUPER_ADMIN`, `CLIENT_ADMIN` — any.
- `USER` — only if assigned to them.

**Returns:** `SubTaskType`

---

### `updateSubTaskStatus(id, status)`

Changes the status of a sub-task. Identical notification behaviour to `updateTaskStatus`.

**Returns:** `SubTaskType`

---

### `deleteSubTask(id)`

Deletes a sub-task.

**Who can call it:**
- `SUPER_ADMIN`, `CLIENT_ADMIN`.
- `USER` — only if they **created** the sub-task.

**Behaviour:** Notifies the assignee (if any) that the sub-task was deleted.

---

### `addTaskComment(taskId, content)` / `addSubTaskComment(subTaskId, content)`

Adds a comment to a task or sub-task.

**Who can call it:** Project members (see `taskComments`).

**Behaviour:**
- `content` is trimmed and must be 1–2000 characters.
- The target's assignee and creator are notified, but not the author.

**Returns:** `CommentType`

---

### `updateComment(id, content)`

Edits a comment. **Author only**, and only while still a project member. **Returns:** `CommentType`.

---

### `deleteComment(id)`

Deletes a comment.

**Who can call it:** The author, the `CLIENT_ADMIN` of the project's client, or any `SUPER_ADMIN`.

**Returns:** `CommentType`

---

### `markAsRead(id)`

Marks a single notification as read.

**Who can call it:** Any authenticated user (own notifications only).

**Returns:** `SubTaskType` (the deleted sub-task)

---

### `markAllAsRead`

Marks all of the caller's unread notifications as read in **one** database write.

**Returns:** `[NotificationType]` — the caller's notifications after the update. Succeeds (with no change) when nothing is unread.

---

### `markNotificationsRead(ids)`

Marks the given notifications read in **one** database write. IDs that belong to other users are ignored.

| Argument | Type | Required | Description |
|---|---|---|---|
| `ids` | [ID!] | Yes | 1–500 notification IDs |

**Returns:** `[NotificationType]` — the caller's notifications after the update.

---

### `deleteNotification(id)`

Deletes a single notification.

**Who can call it:**
- Any user (own notifications).
- `SUPER_ADMIN` (any notification).

**Returns:** `NotificationType`

---

### `deleteAllNotifications`

Deletes all of the caller's notifications.

**Returns:** `[NotificationType]`

---

### `updatePreference(theme?, language?)`

Updates the caller's personal settings.

**Who can call it:** Any authenticated user.

**Arguments:**

| Argument | Type | Allowed Values |
|---|---|---|
| `theme` | Enum | `LIGHT` / `DARK` |
| `language` | Enum | `ENGLISH` / `JAPANESE` / `KOREAN` |

**Returns:** `PreferenceType`

**Side effects:** Invalidates the preference cache entry.

---

## 13. API Reference — Subscriptions

### `notificationCreated`

Delivers real-time notifications to the connected user via WebSocket.

**Who can subscribe:** Any authenticated user.

**How it works:**
1. The client opens a WebSocket to `/graphql` (protocol `graphql-ws`) and sends `connectionParams: { authorization: "Bearer <token>" }`.
2. The server checks the token once, in `onConnect`. A missing or invalid token closes the socket with code **4403**. The client should not retry until the user signs in again.
3. The server listens on the Redis PubSub channel `NOTIFICATION_CREATED:{userId}`.
4. When the notification worker (or the direct-delivery fallback) saves a notification, it publishes it to that channel, and the server forwards it to the subscriber.

**Returns:** `NotificationType` — the newly created notification.

**Filtering:** The subscription automatically filters by user — you only ever receive your own notifications, never someone else's.

---

## 14. Notification System

Notifications are created automatically by services. You never need to call a mutation to create one — they are generated as side effects of other operations.

**Internal flow:**

```
Service (e.g., TaskService.createTask)
       │
       ▼
NotificationService.notify(userId, content)
       │
       ├─► BullMQ queue "notifications" ── job { user, content }
       │        │  (3 attempts, exponential back-off 1s → 2s → 4s)
       │        ▼
       │   Notification worker (worker/notification.worker.js, own process)
       │        │
       │        ▼
       └─► NotificationService.deliver(userId, content)      ◄── also called directly
                │                                               if the queue can't be
                ├─► Saves Notification to MongoDB (UNREAD)      reached within 3 s
                └─► Publishes to Redis PubSub (NOTIFICATION_CREATED:{userId})
                         │
                         └─► GraphQL Subscription → WebSocket → browser (instant)
```

**Key points:**
- The queue is created lazily by `getNotificationQueue()` (`queues/notification.queue.js`), so importing it in tests opens no Redis connection. `app.js` creates it at startup and closes it on shutdown.
- The queue connection uses `enableOfflineQueue: false` so it fails fast when Redis is down. `notify()` then logs a warning and calls `deliver()` itself, so the notification is never lost. The cost is that the calling mutation waits up to 3 s during an outage.
- If the worker is down, jobs wait in Redis and are delivered when it starts. The worker runs with concurrency 5 and finishes its current jobs on SIGTERM.
- A rare duplicate is possible: if `add()` times out but Redis accepts the job anyway, the notification is delivered by both paths.
- **Reading:**
  - `markAsRead(id)` marks one notification.
  - `markAllAsRead` and `markNotificationsRead(ids)` are each a single `updateMany` limited to the caller's notifications.
  - `deleteAllNotifications` is a single `deleteMany`.
- If the browser is offline, the notification is still in MongoDB. The frontend reloads the list after reconnecting and also checks every 5 minutes.
- Callers usually `.catch(() => {})` the `notify()` promise, so a notification problem never fails the operation that caused it.

**Full trigger table:**

| Trigger | Recipient | Message |
|---|---|---|
| `promoteToAdmin` | Promoted user | "You have been promoted to Client Admin." |
| `assignAdmin` | Assigned admin | "You have been assigned as admin for client \"{name}\"." |
| `addUserToProject` | Each new user | "You have been added to project \"{name}\"." |
| `createTask` (with assignee) | Assignee | "You have been assigned a new task: {title}." |
| `updateTask` (reassigned) | New assignee | "You have been assigned a new task: {title}." |
| `updateTaskStatus → RESOLVED` | Creator + Assignee | "Task \"{title}\" has been marked as resolved." |
| `updateTaskStatus → REOPENED` | Creator | "Task \"{title}\" has been reopened." |
| `deleteTask` | Assignee | "Task \"{title}\" has been deleted." |
| `createSubTask` (with assignee) | Assignee | "You have been assigned a new subtask: {title}." |
| `updateSubTask` (reassigned) | New assignee | "You have been assigned a new subtask: {title}." |
| `updateSubTaskStatus → RESOLVED` | Creator + Assignee | Resolved notification |
| `updateSubTaskStatus → REOPENED` | Creator | Reopened notification |
| `deleteSubTask` | Assignee | "Subtask \"{title}\" has been deleted." |
| `addTaskComment` / `addSubTaskComment` | Assignee + creator (not the author) | New comment notification |
| `changeUserRoles` | Each user whose role changed | "Your role was changed to {role}." |
| `declineClientDeletion` | The client's admin | "Your request to delete \"{name}\" was declined." plus the optional message |

---

## 15. Testing

### Philosophy

Tests live in `server/tests/`: 12 suites, 386 tests. They test the **Service layer** in isolation, plus `buildHttpContext` in `server.js` and the notification worker's job handler. The Repository layer is mocked, so no real MongoDB or Redis connection is required to run the tests.

This approach means:
- Tests run fast (milliseconds, not seconds).
- Tests are reliable (no network or database flakiness).
- Business logic correctness is verified independently of database details.

### How Mocking Works

We use Jest's `unstable_mockModule()` for ES Module compatibility. The pattern is always:

```javascript
// 1. Set up the mock
const mockCreate = jest.fn();
jest.unstable_mockModule("../repositories/task.repo.js", () => ({
  TaskRepo: { create: mockCreate }
}));

// 2. Import the service AFTER mocks are in place
const { TaskService } = await import("../services/task.service.js");

// 3. Clear mocks before each test
beforeEach(() => jest.clearAllMocks());
```

**Important:** The `import` of the service must come *after* all mock definitions. Because of ES module hoisting, this is done inside a `beforeAll` or `describe` block using dynamic `await import()`.

### Test first

New behaviour is written test first. Write the test, run it and watch it fail for the expected reason, then write the code until it passes. For code that already exists without a test, add the test and prove it can fail: break the code on purpose, see red, then restore it.

### Naming Conventions

- `🟢` at the start of a test name = happy path (expected success).
- `🔴` at the start of a test name = failure path (expected error or rejection).

---

### Test Coverage

#### Auth Tests (`tests/auth.test.js`)

Tests `UserService` — authentication and user management.

| Test Group | What Is Verified |
|---|---|
| **login — happy paths** | Successful login returns a JWT; token contains correct `id`, `email`, `role`; login resets failure count; works for all three roles |
| **login — failure paths** | Unknown email and wrong password both return "Invalid email or password"; wrong password increments `loginAttempts`; account locked after 5 failures; locked account remains locked within window; empty inputs fail validation |
| **auth audit logging** | LOGIN / LOGIN_FAILED / PASSWORD_RESET_REQUESTED entries written; passwords and tokens never logged |
| **auth security** | register ignores a supplied role; reset token emailed and stored hashed; same response for unknown emails; email failure doesn't break the response; resetPassword looks up the hash |
| **register — happy paths** | New user created with hashed password; default preference created (LIGHT, ENGLISH); `loginAttempts` starts at 0 |
| **register — failure paths** | Duplicate email returns CONFLICT; if preference creation fails, user is rolled back |
| **getProfile** | Returns profile for any authenticated user; throws NOT_FOUND if user deleted between login and profile fetch |
| **promoteToAdmin — happy paths** | SUPER_ADMIN can promote USER; notification is sent to promoted user |
| **promoteToAdmin — failure paths** | Non-SUPER_ADMIN cannot promote; cannot promote an existing admin; user not found; invalid ID |
| **getUsers** | SUPER_ADMIN gets all users (cached); CLIENT_ADMIN gets only project members; USER is forbidden |
| **getUser** | SUPER_ADMIN gets any user (cached); CLIENT_ADMIN only gets their project members; USER is forbidden |
| **deleteUser** | SUPER_ADMIN can delete another user; cannot delete self; non-SUPER_ADMIN cannot delete; NOT_FOUND on missing user |

#### Client Tests (`tests/client.test.js`)

Tests `ClientService`.

| Test Group | What Is Verified |
|---|---|
| **getClients** | SUPER_ADMIN gets all; CLIENT_ADMIN and USER are forbidden |
| **getClient** | SUPER_ADMIN gets any; CLIENT_ADMIN gets only their own; invalid ID rejected; NOT_FOUND if missing |
| **addClient** | SUPER_ADMIN creates; email uniqueness enforced; assignedAdmin must be CLIENT_ADMIN role; admin cannot be assigned to two clients simultaneously |
| **updateClient** | SUPER_ADMIN and CLIENT_ADMIN (own) can update; USER is forbidden |
| **deleteClientRequest** | CLIENT_ADMIN can flag; USER cannot |
| **deleteClientBySuperAdmin** | Requires `deleteRequest: true`; non-SUPER_ADMIN cannot delete |
| **forceDeleteClient** | No flag required; non-SUPER_ADMIN cannot force-delete |
| **assignAdmin** | Correct role required; user cannot be assigned to two clients; notification sent; invalid IDs rejected |

#### Project Tests (`tests/project.test.js`)

Tests `ProjectService`.

| Test Group | What Is Verified |
|---|---|
| **getProjects** | SUPER_ADMIN gets all; CLIENT_ADMIN gets their client's; USER gets only assigned |
| **getProject** | Same scoping rules; ForbiddenError if not authorised |
| **addProject** | USER forbidden; CLIENT_ADMIN scoped to own client; audit logged |
| **updateProject** | USER forbidden; CLIENT_ADMIN scoped |
| **deleteProject** | USER forbidden |
| **addUserToProject** | Filters out already-assigned users; notifies new users; audit logged |
| **removeUserFromProject** | CONFLICT if none of the users are assigned |

#### Task Tests (`tests/task.test.js`)

Tests `TaskService`.

| Test Group | What Is Verified |
|---|---|
| **getTasks** | Role-based access; USER must be in project |
| **getTask** | USER only if assignedTo or createdBy |
| **createTask** | USER forbidden; notification sent to assignee; audit logged |
| **updateTask** | USER only on own tasks; notification on reassignment |
| **updateTaskStatus** | USER only on own; RESOLVED triggers creator + assignee notifications; REOPENED triggers creator notification |
| **deleteTask** | USER forbidden; sub-tasks deleted; assignee notified |

#### SubTask Tests (`tests/subTask.test.js`)

Mirrors Task tests but for sub-tasks. Additional rule: USER can only delete sub-tasks they *created*.

#### Notification Tests (`tests/notification.test.js`)

Mocks `../queues/notification.queue.js`, `../config/pubsub.js` and the repository.

| Test Group | What Is Verified |
|---|---|
| **notify** | Adds a job to the queue (ObjectIds sent as strings); saves directly when the queue rejects or hangs for 3 s |
| **deliver / worker** | Saves an UNREAD notification and publishes it to the user's channel; still returns it if publishing fails; the worker job calls `deliver` and fails (so BullMQ retries) when saving fails |
| **getNotifications** | Returns the caller's notifications; an empty list when there are none |
| **getNotification** | ForbiddenError if notification belongs to different user |
| **markAsRead** | Status updated to READ |
| **markAllAsRead** | One `markRead` write for the caller; succeeds when nothing is unread |
| **markNotificationsRead** | One write scoped to the caller's id; rejects an empty list and invalid ids |
| **deleteNotification** | Own: allowed; SUPER_ADMIN: any; others: forbidden |
| **deleteAllNotifications** | One `deleteByUser` for the caller |

#### Comment Tests (`tests/comment.test.js`)

| Test Group | What Is Verified |
|---|---|
| **taskComments / subTaskComments** | Project members only (assigned USER, the client's CLIENT_ADMIN, SUPER_ADMIN); task list excludes sub-task comments |
| **addTaskComment / addSubTaskComment** | Membership check; content trimmed and 1–2000 chars; assignee and creator notified, author skipped |
| **updateComment** | Author only, and only while still a member |
| **deleteComment** | Author, the client's CLIENT_ADMIN or SUPER_ADMIN |

#### User Administration Tests (`tests/userAdmin.test.js`)

| Test Group | What Is Verified |
|---|---|
| **createUser** | Invite (email sent, `invitedAt` set) and password modes; super admin only; duplicate email; client admin needs a free client |
| **updateUser** | Super admin only; email uniqueness |
| **changeUserRoles** | Bulk update; last super admin protected; client-admin rules; detaches former client admins; notifies |
| **unlockUsers / resendInvite** | Clears lockouts; refuses users who already signed in |
| **deleteUsers** | Cannot include yourself; all-or-nothing; detaches users from tasks, projects and clients |
| **changePassword** | Current password must match; new password validated |

#### Server Tests (`tests/server.test.js`)

`buildHttpContext`: public operations get `user: null`, JWT decoding, operation-name sanitising (non-identifiers become `"unknown"`), and unauthenticated requests are counted.

#### Preference Tests (`tests/preference.test.js`)

| Test Group | What Is Verified |
|---|---|
| **getPreference** | Cache used on second call; NOT_FOUND if not created |
| **updatePreference** | Theme and language update correctly; only provided fields change; cache invalidated |

---

### Running Tests

```bash
# All tests
npm test

# Single domain
npm run test:auth
npm run test:notification
npm run test:comment
npm run test:userAdmin

# Single test by name
node --experimental-vm-modules node_modules/.bin/jest tests/auth.test.js --verbose -t "🟢 should return token on login"

# All tests, single run (no watch)
node --experimental-vm-modules node_modules/.bin/jest --forceExit
```

---

## 16. Logging and Audit Trail

**Logger:** Pino — structured JSON in production, pretty-printed in development.

Every request gets a **child logger** with unique context:
```json
{ "reqId": "abc123", "operation": "createTask", "ip": "192.168.1.1" }
```

**Audit logs** are written for sensitive operations. They include:
```json
{ "audit": true, "userId": "...", "action": "CREATE_TASK", "targetId": "..." }
```

Audited operations:
- Auth: `LOGIN`, `LOGIN_FAILED`, `REGISTER`, `PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET`, `PASSWORD_RESET_FAILED`, `PASSWORD_CHANGED`, `PASSWORD_CHANGE_FAILED`
- `deleteUser`, `deleteUsers`, `promoteToAdmin`, `createUser` (`USER_INVITED` / `USER_CREATED`), `updateUser`, `changeUserRoles`, `unlockUsers`, `resendInvite`
- `declineClientDeletion`
- `addTaskComment` / `addSubTaskComment`, `updateComment`, `deleteComment`
- `addClient`, `updateClient`, `confirmDeleteClient`, `deleteClientBySuperAdmin`, `forceDeleteClient`, `assignAdmin`
- `addProject`, `updateProject`, `deleteProject`, `addUserToProject`, `removeUserFromProject`
- `createTask`, `updateTask`, `updateTaskStatus`, `deleteTask`
- `createSubTask`, `updateSubTask`, `updateSubTaskStatus`, `deleteSubTask`
- `deleteNotification`, `deleteAllNotifications`
- `updatePreference`, `updateProfile`

---

## 17. Metrics

A second HTTP server runs on port **9090** (`METRICS_PORT`) and exposes Prometheus metrics. In cluster mode the primary process serves the totals combined from all workers.

| Metric | Type | Labels | Description |
|---|---|---|---|
| `graphql_requests_total` | Counter | `operation`, `status` (`success` / `error` / `unauthenticated`) | Total number of GraphQL operations, including rejected ones |
| `graphql_request_duration_ms` | Histogram | `operation` | Time taken per operation (buckets: 10, 50, 100, 200, 500, 1000, 2000 ms) |
| `cache_operations_total` | Counter | `op` (`get` / `set` / `invalidate`), `result` (`hit` / `miss` / `ok` / `error`) | Redis cache activity, for the hit ratio |

Standard Node.js metrics (event loop lag, memory usage, etc.) are also collected via `prom-client`'s default registry.

Access metrics: `GET http://localhost:9090/metrics`

**Health checks** (on the API port, no auth):
- `GET http://localhost:8000/health/live` — 200 while the process is up.
- `GET http://localhost:8000/health/ready` — 503 only if MongoDB is unreachable; Redis is reported but optional.

**Alerts** (dev stack, `prometheus/alerts.yml`): API down, error rate above 5%, p95 latency above 1 s. View them at `http://localhost:9091/alerts`.

---

## 18. Docker

### Development Profile

```bash
docker compose --profile dev up
```

Starts:
- **app** — API with nodemon hot-reload, ports 8000 (GraphQL) + 9090 (Metrics)
- **worker** — notification worker (`worker/notification.worker.js`) with nodemon
- **redis** — Redis 7
- **prometheus** — scrapes metrics from `:9090`, evaluates alert rules; UI at `http://localhost:9091`
- **grafana** — `http://localhost:3001` (admin / admin), with the Prometheus data source and "ProjoMan API" dashboard set up automatically

### Production Profile

```bash
docker compose --profile prod up
```

Starts:
- **app-prod** — multi-stage Docker build, minimal image, clustering enabled
- **worker-prod** — the notification worker (`node worker/notification.worker.js`, restarts unless stopped)
- **redis** — Redis 7 (BullMQ needs `maxmemory-policy noeviction`)

The production Dockerfile uses a multi-stage build: dependencies are installed in a builder stage, only the final runtime files are copied to the production image, resulting in a smaller image.
