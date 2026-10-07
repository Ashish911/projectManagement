# ProjoMan — Project Management App

A full-stack project management application. Production-grade GraphQL API on the backend, React SPA on the frontend, with role-based access control across three user tiers.

---

## Repository Structure

```
projectManagement/
├── server/       # Node.js GraphQL API
├── frontend/     # React + TypeScript SPA
├── docs/         # Long-form docs: OVERVIEW, BACKEND, FRONTEND, SYSTEM_DESIGN, AWS_ARCHITECTURE
└── CHANGELOG.md  # What changed, newest first
```

## Documentation

Start with **[`docs/README.md`](docs/README.md)**. It maps every document to its audience and says which one wins when two disagree.

| Need | Read |
|---|---|
| What the system does, in plain language | [`docs/OVERVIEW.md`](docs/OVERVIEW.md) |
| Every API operation, with arguments and permissions | [`server/Routes.md`](server/Routes.md) (quick) · [`docs/BACKEND.md`](docs/BACKEND.md) (full) |
| How the frontend is built | [`docs/FRONTEND.md`](docs/FRONTEND.md) · [`frontend/Routes.md`](frontend/Routes.md) |
| Design decisions and failure modes | [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) |
| What's done, what's broken | [`server/STATUS.md`](server/STATUS.md) · [`frontend/STATUS.md`](frontend/STATUS.md) |
| What changed and how to upgrade | [`CHANGELOG.md`](CHANGELOG.md) |
| Contributing conventions (incl. test-first) | [`CLAUDE.md`](CLAUDE.md) · [`frontend/CLAUDE.md`](frontend/CLAUDE.md) |

---

# Backend

A GraphQL-first backend built on Node.js with a clean layered architecture, role-based access control, Redis caching, real-time subscriptions, a BullMQ notification queue with its own worker, and full observability.

## Backend Status

| Area | Status |
|---|---|
| GraphQL API (Users, Clients, Projects, Tasks, SubTasks) | Complete |
| Comments on Tasks and SubTasks (project members only, author edit, admin moderation) | Complete (frontend: task comments) |
| User Administration (invite / create, edit, bulk role change, unlock, resend invite, bulk remove, change own password) | Complete |
| Client Deletion Review (request, approve, decline with message) | Complete |
| All Tasks Query (`allTasks`, role-scoped, with created/resolved dates for dashboards) | Complete |
| Authentication (JWT, login throttling, account lockout) | Complete |
| Forgot / Reset Password (emailed link via Bird, hashed token, 1-hour expiry) | Complete |
| Role-Based Access Control (SUPER_ADMIN, CLIENT_ADMIN, USER) | Complete, with two known `CLIENT_ADMIN` gaps (S-1, S-2 in `server/STATUS.md`) |
| Redis Caching (entity-level, 5-minute TTL, invalidation on write) | Complete |
| Async Notification Queue (BullMQ + Worker) | Complete — `notify()` enqueues, the worker saves and publishes; delivers directly if Redis is down |
| Real-time GraphQL Subscriptions (notificationCreated; token checked on connect) | Complete |
| Bulk Mark-Read (`markAllAsRead`, `markNotificationsRead(ids)`, one write each) | Complete |
| User Profile Update (name, number, dob, gender) | Complete |
| User Preferences (theme, language) | Complete |
| Notification Triggers (tasks, subtasks, comments, projects, promotions, client assignment) | Complete |
| Unit Tests (Jest + mocks, all service domains) | Complete |
| Structured Logging (Pino, per-request child loggers, audit trail incl. login/password reset, secret redaction) | Complete |
| Prometheus Metrics + Grafana Dashboards (provisioned dashboard, cluster-aggregated metrics, cache hit ratio) | Complete |
| Prometheus Alert Rules (API down, error rate > 5%, p95 > 1s) | Complete |
| Health Checks (`/health/live`, `/health/ready`) | Complete |
| Docker (dev + prod profiles, incl. notification worker) | Complete |
| CPU Clustering (production multi-process) | Complete |
| E2E Testing | Planned |
| CI/CD (GitHub Actions) | Planned |

## Backend Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 (ESM) |
| API | Apollo Server 5 — GraphQL only, no REST |
| Database | MongoDB via Mongoose |
| Cache | Redis 7 (ioredis) |
| Job Queue | BullMQ |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod |
| Logging | Pino |
| Metrics | prom-client (Prometheus) + Grafana |
| Testing | Jest with `unstable_mockModule` for ESM |
| Containerisation | Docker + Docker Compose |
| Security | CORS, dev rate limiting, query depth limit, log redaction |

## Getting Started (Backend)

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- A running MongoDB instance (or Atlas URI)

### Environment Variables

Copy `.env.local` and populate:

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `PORT` | API port (default `8000`) |
| `MONGO_URI` | MongoDB connection string |
| `SECRET_KEY` | JWT signing secret (min 32 chars) |
| `REDIS_HOST` | Redis hostname (default `localhost`) |
| `REDIS_PORT` | Redis port (default `6379`) |
| `REDIS_PASSWORD` | Redis password (optional) |
| `CORS_ORIGIN` | Allowed CORS origin (default `*`) |
| `METRICS_PORT` | Prometheus metrics port (default `9090`) |
| `BIRD_API_KEY` | Bird API key for password-reset and invite emails |
| `EMAIL_FROM` | Sender address (default `onboarding@messagebird.dev`) |
| `APP_URL` | Frontend base URL used in reset and invite links (default `http://localhost:4000`) |

Copy `server/.env.example` to `.env.local` / `.env.prod`. Real env files are git-ignored and must never be committed.

### Running Locally (Docker)

```bash
# Development — hot reload, notification worker, Prometheus + Grafana included
docker compose --profile dev up

# Production — optimised multi-stage build + notification worker
docker compose --profile prod up
```

| Service | URL |
|---|---|
| GraphQL API | http://localhost:8000/graphql |
| Liveness / Readiness | http://localhost:8000/health/live, http://localhost:8000/health/ready |
| Prometheus Metrics | http://localhost:9090/metrics |
| Prometheus (alerts at `/alerts`) | http://localhost:9091 |
| Grafana ("ProjoMan API" dashboard) | http://localhost:3001 (admin/admin) |

### Running Without Docker

```bash
cd server
npm install
npm run dev       # development (uses .env.local; builds indexes automatically)
npm run start     # production (uses .env.prod)
npm run db:indexes:prod   # once per production deploy: apply schema indexes (add `-- --dry-run` to preview)

# Notification worker, in a second terminal (needs Redis)
npx env-cmd -f .env.local node worker/notification.worker.js
```

Without the worker, notifications wait in the queue until it starts (if Redis is down they are saved directly instead).

## Running Tests

```bash
cd server

# All tests (watch mode)
npm test

# Individual domain
npm run test:auth
npm run test:client
npm run test:comment
npm run test:project
npm run test:task
npm run test:subTask
npm run test:notification
npm run test:preference
npm run test:userAdmin
npm run test:indexes
npm run test:graphqlTypes
npm run test:server

# Single test by name
node --experimental-vm-modules node_modules/.bin/jest tests/task.test.js --verbose -t "should notify"
```

Tests use Jest with `unstable_mockModule` to mock at the repository boundary — no real DB connection required. New behaviour is written test first: the test is seen failing before the code makes it pass.

## Architecture Overview

```
Client Request
      │
      ▼
Apollo Server on Express (server.js)
  ├─ /health/live, /health/ready (plain HTTP, no auth)
  ├─ JWT verification (all non-public operations; failures counted + logged)
  ├─ Query depth limit (max 7)
  └─ Per-request context: { user, reqId, logger, operation, startTime }
      │
      ▼
GraphQL Resolvers  ──────────────────────────────────────────┐
(thin delegation layer)                                       │
      │                                                       │
      ▼                                                       │
Services (business logic, role checks, validation)           │
  ├─ Validate input via Zod                                   │
  ├─ Enforce RBAC                                             │
  ├─ Read/write Redis cache                                   │
  ├─ NotificationService.notify → BullMQ queue              │
  │   → worker: MongoDB + Redis PubSub → WebSocket          │
  │   (direct save if the queue is unreachable)             │
  └─ Write audit logs (incl. login / password reset)         │
      │                                                       │
      ▼                                                       │
Repositories (Mongoose wrappers, return .toObject())         │
      │                                                       │
      ▼                                                       │
MongoDB                                                       │
                                                              │
Prometheus Plugin ◄───────────────────────────────────────────┘
  └─ graphql_requests_total (success / error / unauthenticated)
  └─ graphql_request_duration_ms
  └─ cache_operations_total (from config/cache.js)
```

## Role Model

| Role | Capabilities |
|---|---|
| `SUPER_ADMIN` | Full access — manages all clients, users, projects, tasks; invites or creates users (`createUser`), edits them (`updateUser`), changes roles in bulk (`changeUserRoles`), unlocks (`unlockUsers`), resends invites, deletes (`deleteUser`, `deleteUsers`); assigns `CLIENT_ADMIN` users to clients via `assignAdmin`; promotes `USER` → `CLIENT_ADMIN` via `promoteToAdmin`; approves or declines client deletion requests; queries all users |
| `CLIENT_ADMIN` | Manages their assigned client and its projects/tasks; queries users assigned to their client's projects; can request client deletion; can comment on, and delete any comment in, their client's projects |
| `USER` | Access to projects they are assigned to; can update/change status on their own tasks and subtasks; can create subtasks on tasks assigned to them; can comment on tasks and subtasks in their projects and edit/delete their own comments |

## Public Operations (no JWT required)

`LoginMutation`, `RegisterMutation`, `ForgotPasswordMutation`, `ResetPasswordMutation`

## Notification Triggers

Notifications are queued in BullMQ; the worker saves each one and pushes it over the `notificationCreated` WebSocket subscription, so the frontend shows it instantly (with a 5-minute safety poll).

| Event | Recipients |
|---|---|
| User promoted to CLIENT_ADMIN | Promoted user |
| Admin assigned to client | Assigned admin |
| User added to project | Each newly added user |
| Task created with assignee | Assignee |
| Task reassigned | New assignee |
| Task resolved | Creator + assignee |
| Task reopened | Creator |
| Task deleted | Assignee |
| SubTask created with assignee | Assignee |
| SubTask reassigned | New assignee |
| SubTask resolved | Creator + assignee |
| SubTask reopened | Creator |
| SubTask deleted | Assignee |
| Comment added on a task or subtask | Its assignee + creator (not the author) |
| Role changed (`changeUserRoles`) | Each user whose role changed |
| Client deletion request declined | The client's admin (with the super admin's message) |

## GraphQL API Reference

### Queries

| Query | Args | Role |
|---|---|---|
| `profile` | — | Any authenticated |
| `users` | — | SUPER_ADMIN (all), CLIENT_ADMIN (project members) |
| `user` | `id` | SUPER_ADMIN (any), CLIENT_ADMIN (project members) |
| `clients` | — | SUPER_ADMIN |
| `client` | `id` | SUPER_ADMIN, assigned CLIENT_ADMIN |
| `projects` | — | Role-scoped |
| `project` | `id` | Role-scoped |
| `tasks` | `projectId` | Project members |
| `task` | `id` | Role-scoped |
| `subTasks` | `taskId` | Task members |
| `subTask` | `id` | Role-scoped |
| `allTasks` | — | Role-scoped (all / client's projects / assigned projects) |
| `taskComments` | `taskId` | Project members |
| `subTaskComments` | `subTaskId` | Project members |
| `notifications` | — | Own only, newest first |
| `notification` | `id` | Own only |
| `preference` | — | Own only |

### Mutations

| Mutation | Description |
|---|---|
| `login` | Returns JWT token |
| `register` | Creates a `USER` + default preference (role cannot be chosen) |
| `forgotPassword` | Emails a reset link (1h expiry); same response whether or not the account exists |
| `resetPassword` | Validates token, updates password |
| `updateProfile` | Updates name, number, dob, gender |
| `promoteToAdmin` | SUPER_ADMIN: USER → CLIENT_ADMIN |
| `deleteUser` | SUPER_ADMIN: permanent delete |
| `createUser` | SUPER_ADMIN: invite by email or set a temporary password |
| `updateUser` | SUPER_ADMIN: edit details |
| `changeUserRoles` | SUPER_ADMIN: bulk role change (one super admin must remain) |
| `unlockUsers` | SUPER_ADMIN: clear lockouts |
| `resendInvite` | SUPER_ADMIN: new 48-hour invite link |
| `deleteUsers` | SUPER_ADMIN: bulk delete |
| `changePassword` | Own password (current password required) |
| `addClient` | SUPER_ADMIN only |
| `updateClient` | SUPER_ADMIN or assigned CLIENT_ADMIN |
| `assignAdmin` | SUPER_ADMIN: assign CLIENT_ADMIN to client |
| `confirmDeleteClient` | CLIENT_ADMIN: flags client for deletion |
| `deleteClientBySuperAdmin` | SUPER_ADMIN: deletes flagged client |
| `forceDeleteClient` | SUPER_ADMIN: deletes without flag check |
| `declineClientDeletion` | SUPER_ADMIN: clears the request, notifies the client admin |
| `addProject` | SUPER_ADMIN / CLIENT_ADMIN |
| `updateProject` | SUPER_ADMIN / CLIENT_ADMIN |
| `deleteProject` | SUPER_ADMIN / CLIENT_ADMIN |
| `addUserToProject` | SUPER_ADMIN / CLIENT_ADMIN |
| `removeUserFromProject` | SUPER_ADMIN / CLIENT_ADMIN |
| `createTask` | SUPER_ADMIN / CLIENT_ADMIN |
| `updateTask` | SUPER_ADMIN / CLIENT_ADMIN / assigned USER |
| `updateTaskStatus` | SUPER_ADMIN / CLIENT_ADMIN / assigned USER |
| `deleteTask` | SUPER_ADMIN / CLIENT_ADMIN (cascades to subtasks and comments) |
| `createSubTask` | SUPER_ADMIN / CLIENT_ADMIN / task-assigned USER |
| `updateSubTask` | SUPER_ADMIN / CLIENT_ADMIN / assigned USER |
| `updateSubTaskStatus` | SUPER_ADMIN / CLIENT_ADMIN / assigned USER |
| `deleteSubTask` | SUPER_ADMIN / CLIENT_ADMIN / creator USER |
| `addTaskComment` | Project members (assigned users, the client's CLIENT_ADMIN, SUPER_ADMIN) |
| `addSubTaskComment` | Project members |
| `updateComment` | Author only (while still a project member) |
| `deleteComment` | Author / the client's CLIENT_ADMIN / SUPER_ADMIN |
| `markAsRead` | Own notifications |
| `markAllAsRead` | Own notifications (one write) |
| `markNotificationsRead` | Own notifications by id (one write) |
| `deleteNotification` | Own (SUPER_ADMIN can delete any) |
| `deleteAllNotifications` | Own notifications |
| `updatePreference` | Own preference |

### Subscriptions

| Subscription | Description |
|---|---|
| `notificationCreated` | Real-time delivery per user via Redis PubSub; token checked on connect (bad token → close 4403) |

## Backend Project Structure

```
server/
├── app.js                    # Bootstrap: DB, metrics server, cluster, crash logging
├── cluster.js                # Production worker forking
├── server.js                 # Apollo Server, JWT context, plugins
├── config/
│   ├── env.js                # Zod env validation (fails fast on startup)
│   ├── db.js                 # MongoDB connection
│   ├── redis.js              # Redis client with retry + health check
│   ├── cache.js              # Cache wrapper (get/set/invalidate/pattern)
│   ├── logger.js             # Pino logger (secret redaction)
│   ├── metrics.js            # Prometheus request + cache metrics
│   ├── health.js             # Readiness checks (MongoDB required, Redis reported)
│   └── pubsub.js             # Redis PubSub for GraphQL subscriptions
├── graphql/
│   ├── schema.js             # Root Query, Mutation, Subscription definitions
│   ├── resolvers/            # 8 resolver files + barrel — delegate to services
│   └── types/                # 8 GraphQL type files + barrel (incl. comment)
├── services/                 # Business logic (9 services incl. email)
├── repositories/             # DB access via Mongoose (8 repos)
├── models/                   # Mongoose schemas (8 models)
├── queues/                   # BullMQ notification queue (getNotificationQueue)
├── worker/                   # Notification worker process (delivers queued notifications)
├── validation/               # Zod schemas + validate() helper
├── errors/                   # AppError hierarchy (NotFound, Forbidden, etc.)
├── middleware/               # Rate limiter
├── scripts/                  # sync-indexes.js — deploy-time index sync
├── tests/                    # Jest unit tests (12 suites, 386 tests)
├── prometheus/               # Scrape config + alert rules
└── grafana/                  # Provisioned data source + dashboards
```

## Backend Roadmap

- [x] Comment system (task + subtask comments, project-member access)
- [ ] E2E test suite
- [ ] GitHub Actions CI/CD pipeline (lint, test, Docker build, deploy)
- [ ] AWS deployment (see `docs/AWS_ARCHITECTURE.md`)

---

---

# Frontend

A React + TypeScript SPA connecting to the GraphQL backend with full role-based UI, real-time notifications, analytics, and a drag-and-drop task board.

## Frontend Status

| Feature | Status |
|---|---|
| Login | Complete |
| Register (email, name, phone, DOB, gender, password) | Complete |
| JWT auth + protected routes | Complete |
| Role-based route guards (per-route access control) | Complete |
| Logout (full session + Redux state reset) | Complete |
| Forgot Password (token generation, displayed in UI) | Complete |
| Reset Password (token + new password form) | Complete |
| User profile view + edit (name, phone, DOB, gender) | Complete |
| User preferences (theme: Light/Dark, language) | Complete |
| Dashboard (analytics drill-down to filtered pages) | Complete |
| Users page (search, role tabs, invite / create, edit, bulk role / unlock / remove, export) | Complete |
| Clients page (CRUD, assign admin, delete flow) | Complete |
| Projects page (search, status filter, team management) | Complete |
| Tasks page (hierarchical task + subtask management) | Complete |
| Tasks board (drag and drop between statuses, list view; `/kanban` redirects here) | Complete |
| Forms system (`openForm`, ⌘K palette, validation on blur, delete with 5s Undo) | Complete |
| Analytics page (stat cards, donut charts, progress bars, drill-down) | Complete |
| Notifications (live over WebSocket with toast; click marks one read; "Mark all read" in one request; delete, clear all) | Complete |
| Reusable hooks (`src/hooks/`: useAsyncAction, useLocalStorage, useSelection, useOutside, useSubscription, useNotifications) | Complete |
| Sidebar navigation (role-aware links per role) | Complete |
| Dark mode (header toggle, synced with Preference, no flash on reload) | Complete |
| Redesign: shell, Dashboard, Users, Clients, Projects + project detail, Tasks (from `ProjoMan Dashboard (standalone) (1).html`) | Complete — Account, Analytics and auth screens not yet restyled |
| Comments (task sheet) | Complete — subtask comments planned |
| Unit / component tests (Vitest + Testing Library, 82 tests) | Complete |
| E2E / Integration tests | Planned |

## Frontend Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 4 (dev port: **4000**) |
| Routing | React Router 6 |
| UI components | shadcn/ui + Radix UI primitives |
| Styling | Tailwind CSS 3 (dark mode via `class`, CSS variables) |
| State | Redux Toolkit + Redux Thunk (auth, profile, all entity lists) |
| Server state | React Query 3 (`useMutation` in auth forms) |
| API | One `gql()` helper (Axios) → raw GraphQL strings → `VITE_API_URL` |
| Live updates | `graphql-ws` client for subscriptions |
| Drag and drop | `@dnd-kit/core` |
| Tests | Vitest + Testing Library (jsdom) |
| Icons | Tabler Icons + Lucide React |

## Getting Started (Frontend)

### Prerequisites

- Node.js 20+
- Backend API running on port `8000`

### Running Locally

```bash
cd frontend
npm install
npm run dev       # dev server on http://localhost:4000
npm run build     # production build
npm run preview   # preview production build
npm test          # Vitest (watch); npm run test:run for a single run
```

### Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | GraphQL endpoint, e.g. `http://localhost:8000/graphql` |
| `VITE_WS_URL` | Optional WebSocket endpoint; defaults to `VITE_API_URL` with `http` → `ws` |

## Routes

| Path | Page | Guard | Allowed Roles |
|---|---|---|---|
| `/` | Login | Public (→ `/dashboard` if authed) | — |
| `/register` | Register | Public | — |
| `/forgot-password` | Forgot Password | Public | — |
| `/reset-password` | Reset Password | Public | — |
| `/dashboard` | Dashboard / Analytics | Protected | All |
| `/account` | Profile + Preferences | Protected | All |
| `/users` | User Management | Protected | SUPER_ADMIN |
| `/clients` | Client Management | Protected | SUPER_ADMIN, CLIENT_ADMIN |
| `/projects` | Project Management | Protected | All |
| `/projects/:id` | Project detail | Protected | All |
| `/tasks` | Task board + list | Protected | All |
| `/kanban` | Redirects to `/tasks` | — | — |
| `/analytics` | Analytics Dashboard | Protected | SUPER_ADMIN, CLIENT_ADMIN |

## Role-Based UI Summary

| Page / Feature | SUPER_ADMIN | CLIENT_ADMIN | USER |
|---|---|---|---|
| View Dashboard | ✓ | ✓ | ✓ |
| Users page | ✓ (invite, edit, bulk role / unlock / remove, export) | — | — |
| Promote to Admin | ✓ | — | — |
| Delete user | ✓ | — | — |
| Clients page | ✓ (all clients) | ✓ (own client, view/edit) | — |
| Create client | ✓ | — | — |
| Assign admin to client | ✓ | — | — |
| Request client deletion | — | ✓ | — |
| Approve / decline deletion request | ✓ | — | — |
| Force delete client | ✓ | — | — |
| Projects page | ✓ (all) | ✓ (own client) | ✓ (assigned) |
| Create / Edit / Delete project | ✓ | ✓ | — |
| Manage project team | ✓ | ✓ | — |
| Tasks board (drag to change status) | ✓ | ✓ | ✓ (own tasks) |
| Create / Delete task | ✓ | ✓ | — |
| Update task status | ✓ | ✓ | ✓ (assigned only) |
| Create subtask | ✓ | ✓ | ✓ (if on parent task) |
| Analytics page | ✓ | ✓ | — |
| Notifications | ✓ | ✓ | ✓ |
| Profile + Preferences | ✓ | ✓ | ✓ |

## Redux Store Structure

```
store
├── login        → { token, loading, error }
├── register     → { loading, success, error }
├── profile      → { profile: User, loading, error }
├── preference   → { preference, loading, saving, error }
├── usersList    → { users[], loading, error, roleFilter }
├── clients      → { clients[], loading, error, activeFilter }
├── projects     → { projects[], loading, error, statusFilter }
├── tasks        → { tasks[], loaded, loading, error, selectedProjectId }
└── subTasks     → { subTasks[], loading, error, selectedTaskId }
```

All list-fetch thunks check `getState()` before calling the API — data already in store is reused as a cache. Mutations update the store in-place. `LOGOUT` resets all slices simultaneously by passing `undefined` to the root reducer.

## API Layer

All requests go through `gql()` in `src/api/graphql.ts`: raw GraphQL strings sent by one Axios instance, which attaches `Authorization: Bearer <token>`. Subscriptions use the `graphql-ws` client in `src/api/ws.ts`.

| File | Operations |
|---|---|
| `authApi.ts` | loginUser, registerUser, forgotPassword, resetPassword |
| `userApi.ts` | getProfile, getUsers, updateProfile, deleteUser, promoteToAdmin, createUser, updateUser, changeUserRoles, unlockUsers, resendInvite, deleteUsers, changePassword |
| `clientApi.ts` | getClients, getClient, addClient, updateClient, assignAdmin, confirmDeleteClient, deleteClientBySuperAdmin, forceDeleteClient, declineClientDeletion |
| `projectApi.ts` | getProjects, addProject, updateProject, deleteProject, addUserToProject, removeUserFromProject |
| `taskApi.ts` | getTasks, getAllTasks, createTask, updateTask, updateTaskStatus, deleteTask |
| `subTaskApi.ts` | getSubTasks, createSubTask, updateSubTask, updateSubTaskStatus, deleteSubTask |
| `notificationApi.ts` | getNotifications, markAsRead, markAllAsRead, markNotificationsRead, deleteNotification, deleteAllNotifications, subscribeToNotifications |
| `commentApi.ts` | getTaskComments, addTaskComment, deleteComment |
| `preferenceApi.ts` | getPreference, updatePreference |

## Frontend Project Structure

```
frontend/src/
├── api/                  # gql() helper, ws.ts WebSocket client, one file per entity
├── queries/              # Raw GraphQL query strings
├── mutations/            # Raw GraphQL mutation strings
├── types/                # TypeScript interfaces for all entities
├── hooks/                # Reusable hooks (async actions, storage, selection, subscriptions, notifications)
├── redux/
│   ├── store/            # Root store with LOGOUT reset pattern
│   ├── reducers/         # 9 reducers (auth, profile, users, clients, etc.)
│   ├── actions/          # Thunk actions (fetch + mutate)
│   └── constants/        # Action type string constants
├── Screens/
│   ├── Auth/             # Login, Register, ForgotPassword, ResetPassword
│   ├── Dashboard/        # Dashboard (Admin / Member), Account, Users, Clients,
│   │                     #   Projects, ProjectDetail, Tasks, Analytics
│   ├── Components/       # AppLayout, Sidebar, SiteHeader, ProfileContent,
│   │                     #   AnalyticsDashboard, NavUser, NavMain
│   ├── ui-Components/    # Shared auth form components
│   └── RouteHandler/     # ProtectedRoute (token + role) & PublicRoute
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── pm/               # Design-system building blocks + SVG charts
│   ├── forms/            # Form system, sheets, toaster, ⌘K palette
│   ├── hooks/            # useTheme, useIsMobile, legacy input hooks
│   └── lib/              # cn() utility
├── App.tsx               # Root with Router + Redux + QueryClient providers
└── main.tsx              # Entry point
```

## Frontend Roadmap

- [ ] Subtask comments and comment editing in the UI (API is ready)
- [ ] E2E tests (Playwright)
- [ ] Real-time task updates via GraphQL subscription (`useSubscription` is ready)
- [ ] Mobile-responsive layout improvements
