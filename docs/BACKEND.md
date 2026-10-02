# ProjoMan — Backend Documentation

> A complete guide to the server-side API: how it is built, every endpoint, the rules it enforces, and what the tests verify.

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
│  • Trigger notifications                     │
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
│   ├── db.js                 # MongoDB connection via Mongoose
│   ├── redis.js              # Redis client with retry strategy
│   ├── cache.js              # Cache helper: get / set / invalidate / invalidatePattern
│   ├── health.js             # Readiness checks for /health/ready
│   ├── logger.js             # Pino logger (with secret redaction) + MongoDB index creation on startup
│   ├── metrics.js            # Prometheus request and cache metric definitions
│   └── pubsub.js             # Redis PubSub for GraphQL subscriptions
│
├── graphql/
│   ├── schema.js             # Root Query, Mutation, Subscription definitions
│   ├── resolvers/            # One resolver file per domain (user, project, client, task, etc.)
│   └── types/                # GraphQL type definitions (UserType, TaskType, etc.)
│
├── services/                 # All business logic (one file per domain) + email.service.js (Bird)
├── repositories/             # All Mongoose access (one file per domain)
├── models/                   # Mongoose schema definitions (9 models)
│
├── queues/
│   └── notification.queue.js # BullMQ queue definition
├── worker/
│   └── notification.worker.js# Standalone BullMQ worker process (not used yet: nothing enqueues jobs)
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
│   └── rateLimiter.js        # Express rate limiting
│
├── tests/                    # Jest unit tests (one file per domain + server.test.js)
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
npm run test:server

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
| `BIRD_API_KEY` | No | — | Bird API key for password-reset emails; without it no email is sent |
| `EMAIL_FROM` | No | `onboarding@messagebird.dev` | Sender address (Bird's test sender by default) |
| `APP_URL` | No | `http://localhost:4000` | Frontend base URL used to build reset links |

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
2. Call `resetPassword(token, password)` with the token from the link — the server hashes it, finds the matching user, updates the password (bcrypt), and clears the reset token and all previous login failure counts.

---

## 6. Role-Based Access Control

There are three roles. Every service method checks the caller's role and throws a `ForbiddenError` if they are not allowed. This check happens on the server — it cannot be bypassed.

### SUPER_ADMIN
- Full access to everything across all clients.
- Can create, read, update, and delete any data in the system.
- Can promote a `USER` to `CLIENT_ADMIN`.
- Can delete any user (except themselves).
- Can assign a `CLIENT_ADMIN` to a client.
- Can delete clients (with or without a deletion request flag).
- Sees all users, all clients, all projects, all tasks.

### CLIENT_ADMIN
- Scoped to their assigned client.
- Can manage projects that belong to their client.
- Can add and remove users from those projects.
- Can create, update, and delete tasks within their projects.
- Can see users who are assigned to their projects.
- Can update their own client's details.
- Can request their client for deletion (sets a flag for SUPER_ADMIN to confirm).
- Cannot touch another client's data.

### USER
- The most restricted role.
- Sees only projects they have been explicitly added to.
- Can view tasks within those projects.
- Can update status and details of tasks assigned specifically to them.
- Can create sub-tasks on tasks they are assigned to.
- Can update and resolve sub-tasks assigned to them.
- Can delete sub-tasks they created.
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
- Enum fields (role, status, priority, theme, language) must be one of the allowed values.
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
| `createdAt` / `updatedAt` | Date | Auto-managed by Mongoose |

---

### Client

Represents a company using the platform.

| Field | Type | Notes |
|---|---|---|
| `id` | ObjectId | Auto-generated |
| `name` | String | Company name |
| `email` | String | Contact email, unique |
| `phone` | String | Contact phone |
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
| `createdAt` / `updatedAt` | Date | Auto-managed |

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

### Comment *(model exists — service not yet implemented)*

A comment on a task or sub-task.

| Field | Type | Notes |
|---|---|---|
| `id` | ObjectId | Auto-generated |
| `content` | String | The comment text |
| `userId` | ObjectId (ref: User) | Who wrote the comment |
| `taskId` | ObjectId (ref: Task) | Which task this comment is on |
| `subTaskId` | ObjectId (ref: SubTask) | Which sub-task (optional) |
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

### `notifications`

Returns all notifications for the currently logged-in user.

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
| `gender` | Enum | Yes | — | `MALE` / `FEMALE` / `OTHERS` |

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
- Logs an audit event.

**Errors:**
- `FORBIDDEN` — caller is not SUPER_ADMIN, or is trying to delete themselves.
- `NOT_FOUND` — user does not exist.

---

### `addClient(name, email, phone, assignedAdmin?)`

Creates a new client (company).

**Who can call it:** `SUPER_ADMIN` only.

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Company name |
| `email` | String | Yes | Contact email |
| `phone` | String | Yes | Contact phone |
| `assignedAdmin` | ID | No | ID of a CLIENT_ADMIN user to assign immediately |

**Returns:** `ClientType`

**Behaviour:**
- Validates email is unique.
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

### `addProject(name, clientId, description?, status?)`

Creates a new project.

**Who can call it:** `SUPER_ADMIN`, `CLIENT_ADMIN`.

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Project name |
| `clientId` | ID | Yes | Client the project belongs to |
| `description` | String | No | Max 500 characters |
| `status` | Enum | No | `NOT_STARTED` (default) / `IN_PROGRESS` / `COMPLETED` |

**Returns:** `ProjectType`

**Behaviour:** CLIENT_ADMIN can only create projects for their assigned client.

---

### `updateProject(id, name?, description?, status?)`

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

### `createTask(title, projectId, assignedTo?, deadline?, priority?)`

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

### `markAsRead(id)`

Marks a single notification as read.

**Who can call it:** Any authenticated user (own notifications only).

**Returns:** `NotificationType`

---

### `markAllAsRead`

Marks all of the caller's unread notifications as read at once.

**Returns:** `[NotificationType]`

**Errors:** `NOT_FOUND` — no unread notifications exist.

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
1. The client opens a WebSocket connection and sends a `subscribe` operation with a valid JWT.
2. The server uses Redis PubSub to listen on the channel `NOTIFICATION_CREATED:{userId}`.
3. When any service calls `NotificationService.notify(userId, message)`, the message is published to Redis.
4. The server forwards the message through the WebSocket to the matching subscriber.

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
       ├─► Saves Notification to MongoDB (status: UNREAD)
       │
       └─► Publishes to Redis PubSub (NOTIFICATION_CREATED:{userId})
                 │
                 └─► GraphQL Subscription → WebSocket → User's browser (instant)
```

If the user's browser is not connected via WebSocket (or the connection dropped), the notification is still saved in MongoDB and will appear the next time the frontend polls (every 30 seconds).

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

---

## 15. Testing

### Philosophy

Tests live in `server/tests/`. They test the **Service layer** in isolation. The Repository layer is mocked, so no real MongoDB or Redis connection is required to run the tests.

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

| Test Group | What Is Verified |
|---|---|
| **notify** | Creates notification with UNREAD status |
| **getNotifications** | Returns caller's notifications; throws NOT_FOUND if empty |
| **getNotification** | ForbiddenError if notification belongs to different user |
| **markAsRead** | Status updated to READ |
| **markAllAsRead** | All UNREAD updated; NOT_FOUND if none unread |
| **deleteNotification** | Own: allowed; SUPER_ADMIN: any; others: forbidden |
| **deleteAllNotifications** | Deletes all for caller |

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
- `deleteUser`, `promoteToAdmin`
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
- **redis** — Redis 7
- **prometheus** — scrapes metrics from `:9090`, evaluates alert rules; UI at `http://localhost:9091`
- **grafana** — `http://localhost:3001` (admin / admin), with the Prometheus data source and "ProjoMan API" dashboard set up automatically

### Production Profile

```bash
docker compose --profile prod up
```

Starts:
- **app-prod** — multi-stage Docker build, minimal image, clustering enabled
- **redis** — Redis 7

A **worker** service for `worker/notification.worker.js` is defined but commented out, because nothing adds notification jobs to the queue yet.

The production Dockerfile uses a multi-stage build: dependencies are installed in a builder stage, only the final runtime files are copied to the production image, resulting in a smaller image.
