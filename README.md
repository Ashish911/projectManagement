# ProjoMan — Project Management App

A full-stack project management application. Production-grade GraphQL API on the backend, React SPA on the frontend, with role-based access control across three user tiers.

---

## Repository Structure

```
projectManagement/
├── server/       # Node.js GraphQL API
├── frontend/     # React + TypeScript SPA
└── docs/         # Architecture docs (AWS_ARCHITECTURE.md, etc.)
```

---

# Backend

A GraphQL-first backend built on Node.js with a clean layered architecture, role-based access control, Redis caching, real-time subscriptions, an async job queue (being wired in), and full observability.

## Backend Status

| Area | Status |
|---|---|
| GraphQL API (Users, Clients, Projects, Tasks, SubTasks) | Complete |
| Authentication (JWT, login throttling, account lockout) | Complete |
| Forgot / Reset Password (emailed link via Bird, hashed token, 1-hour expiry) | Complete |
| Role-Based Access Control (SUPER_ADMIN, CLIENT_ADMIN, USER) | Complete |
| Redis Caching (entity-level, 5-minute TTL, invalidation on write) | Complete |
| Async Notification Queue (BullMQ + Worker) | Partial — queue and worker exist; notifications are not enqueued yet |
| Real-time GraphQL Subscriptions (notificationCreated) | Complete |
| User Profile Update (name, number, dob, gender) | Complete |
| User Preferences (theme, language) | Complete |
| Notification Triggers (tasks, subtasks, projects, promotions, client assignment) | Complete |
| Unit Tests (Jest + mocks, all service domains) | Complete |
| Structured Logging (Pino, per-request child loggers, audit trail incl. login/password reset, secret redaction) | Complete |
| Prometheus Metrics + Grafana Dashboards (provisioned dashboard, cluster-aggregated metrics, cache hit ratio) | Complete |
| Prometheus Alert Rules (API down, error rate > 5%, p95 > 1s) | Complete |
| Health Checks (`/health/live`, `/health/ready`) | Complete |
| Docker (dev + prod profiles) | Complete — worker container defined but commented out |
| CPU Clustering (production multi-process) | Complete |
| Comment System | Model defined — service/resolver integration pending |
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
| `BIRD_API_KEY` | Bird API key for password-reset email |
| `EMAIL_FROM` | Sender address (default `onboarding@messagebird.dev`) |
| `APP_URL` | Frontend base URL used in reset links (default `http://localhost:4000`) |

Copy `server/.env.example` to `.env.local` / `.env.prod`. Real env files are git-ignored and must never be committed.

### Running Locally (Docker)

```bash
# Development — hot reload, Prometheus + Grafana included
docker compose --profile dev up

# Production — optimised multi-stage build
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
npm run dev       # development (uses .env.local)
npm run start     # production (uses .env.prod)
```

## Running Tests

```bash
cd server

# All tests (watch mode)
npm test

# Individual domain
npm run test:auth
npm run test:client
npm run test:project
npm run test:task
npm run test:subTask
npm run test:notification
npm run test:preference
npm run test:server

# Single test by name
node --experimental-vm-modules node_modules/.bin/jest tests/task.test.js --verbose -t "should notify"
```

Tests use Jest with `unstable_mockModule` to mock at the repository boundary — no real DB connection required. Suites that don't mock `config/cache.js` (currently `client` and `preference`) talk to a local Redis if one is running, which causes 3 known failures.

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
  ├─ Call NotificationService → MongoDB + Redis PubSub       │
  │   (BullMQ queue + worker exist but are not wired in)     │
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
| `SUPER_ADMIN` | Full access — manages all clients, users, projects, tasks; assigns `CLIENT_ADMIN` users to clients via `assignAdmin`; promotes `USER` → `CLIENT_ADMIN` via `promoteToAdmin`; deletes users; queries all users |
| `CLIENT_ADMIN` | Manages their assigned client and its projects/tasks; queries users assigned to their client's projects; can request client deletion |
| `USER` | Access to projects they are assigned to; can update/change status on their own tasks and subtasks; can create subtasks on tasks assigned to them |

## Public Operations (no JWT required)

`LoginMutation`, `RegisterMutation`, `ForgotPasswordMutation`, `ResetPasswordMutation`

## Notification Triggers

Notifications are created and delivered in real-time via Redis PubSub (GraphQL subscription) or polled every 30 seconds by the frontend.

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
| `notifications` | — | Own only |
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
| `addClient` | SUPER_ADMIN only |
| `updateClient` | SUPER_ADMIN or assigned CLIENT_ADMIN |
| `assignAdmin` | SUPER_ADMIN: assign CLIENT_ADMIN to client |
| `confirmDeleteClient` | CLIENT_ADMIN: flags client for deletion |
| `deleteClientBySuperAdmin` | SUPER_ADMIN: deletes flagged client |
| `forceDeleteClient` | SUPER_ADMIN: deletes without flag check |
| `addProject` | SUPER_ADMIN / CLIENT_ADMIN |
| `updateProject` | SUPER_ADMIN / CLIENT_ADMIN |
| `deleteProject` | SUPER_ADMIN / CLIENT_ADMIN |
| `addUserToProject` | SUPER_ADMIN / CLIENT_ADMIN |
| `removeUserFromProject` | SUPER_ADMIN / CLIENT_ADMIN |
| `createTask` | SUPER_ADMIN / CLIENT_ADMIN |
| `updateTask` | SUPER_ADMIN / CLIENT_ADMIN / assigned USER |
| `updateTaskStatus` | SUPER_ADMIN / CLIENT_ADMIN / assigned USER |
| `deleteTask` | SUPER_ADMIN / CLIENT_ADMIN |
| `createSubTask` | SUPER_ADMIN / CLIENT_ADMIN / task-assigned USER |
| `updateSubTask` | SUPER_ADMIN / CLIENT_ADMIN / assigned USER |
| `updateSubTaskStatus` | SUPER_ADMIN / CLIENT_ADMIN / assigned USER |
| `deleteSubTask` | SUPER_ADMIN / CLIENT_ADMIN / creator USER |
| `markAsRead` | Own notifications |
| `markAllAsRead` | Own notifications |
| `deleteNotification` | Own (SUPER_ADMIN can delete any) |
| `deleteAllNotifications` | Own notifications |
| `updatePreference` | Own preference |

### Subscriptions

| Subscription | Description |
|---|---|
| `notificationCreated` | Real-time delivery per-user via Redis PubSub |

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
│   ├── logger.js             # Pino logger + DB index creation
│   ├── metrics.js            # Prometheus request + cache metrics
│   ├── health.js             # Readiness checks (MongoDB required, Redis reported)
│   └── pubsub.js             # Redis PubSub for GraphQL subscriptions
├── graphql/
│   ├── schema.js             # Root Query, Mutation, Subscription definitions
│   ├── resolvers/            # 8 resolver files — delegate to services
│   └── types/                # 9 GraphQL type definitions
├── services/                 # Business logic (8 services)
├── repositories/             # DB access via Mongoose (8 repos)
├── models/                   # Mongoose schemas (9 models incl. Comment)
├── queues/                   # BullMQ queue definitions
├── worker/                   # Standalone notification worker process
├── validation/               # Zod schemas + validate() helper
├── errors/                   # AppError hierarchy (NotFound, Forbidden, etc.)
├── middleware/               # Rate limiter
├── tests/                    # Jest unit tests (8 test files)
├── prometheus/               # Scrape config + alert rules
└── grafana/                  # Provisioned data source + dashboards
```

## Backend Roadmap

- [ ] Comment system (model exists, needs service + resolver + GraphQL type)
- [ ] E2E test suite
- [ ] GitHub Actions CI/CD pipeline (lint, test, Docker build, deploy)
- [ ] AWS deployment (see `docs/AWS_ARCHITECTURE.md`)

---

---

# Frontend

A React + TypeScript SPA connecting to the GraphQL backend with full role-based UI, real-time notifications, analytics, and a Kanban board.

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
| Users page (search, role filter, promote, delete) | Complete |
| Clients page (CRUD, assign admin, delete flow) | Complete |
| Projects page (search, status filter, team management) | Complete |
| Tasks page (hierarchical task + subtask management) | Complete |
| Kanban board (column-based status view, click to move) | Complete |
| Analytics page (stat cards, donut charts, progress bars, drill-down) | Complete |
| Notifications (30s polling, mark read, delete, clear all) | Complete |
| Sidebar navigation (role-aware links per role) | Complete |
| Dark mode | Supported via Tailwind `class` strategy |
| Comment system (frontend) | Planned |
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
| API | Axios → raw GraphQL strings → `http://localhost:8000/graphql` |
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
```

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
| `/tasks` | Task + SubTask Management | Protected | All |
| `/kanban` | Kanban Board | Protected | USER |
| `/analytics` | Analytics Dashboard | Protected | SUPER_ADMIN, CLIENT_ADMIN |

## Role-Based UI Summary

| Page / Feature | SUPER_ADMIN | CLIENT_ADMIN | USER |
|---|---|---|---|
| View Dashboard | ✓ | ✓ | ✓ |
| Users page | ✓ (full CRUD) | — | — |
| Promote to Admin | ✓ | — | — |
| Delete user | ✓ | — | — |
| Clients page | ✓ (all clients) | ✓ (own client, view/edit) | — |
| Create client | ✓ | — | — |
| Assign admin to client | ✓ | — | — |
| Request client deletion | — | ✓ | — |
| Force delete client | ✓ | — | — |
| Projects page | ✓ (all) | ✓ (own client) | ✓ (assigned) |
| Create / Edit / Delete project | ✓ | ✓ | — |
| Manage project team | ✓ | ✓ | — |
| Tasks page | ✓ | ✓ | ✓ |
| Create / Delete task | ✓ | ✓ | — |
| Update task status | ✓ | ✓ | ✓ (assigned only) |
| Create subtask | ✓ | ✓ | ✓ (if on parent task) |
| Kanban board | — | — | ✓ |
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
├── tasks        → { tasks[], loading, error, selectedProjectId }
└── subTasks     → { subTasks[], loading, error, selectedTaskId }
```

All list-fetch thunks check `getState()` before calling the API — data already in store is reused as a cache. Mutations update the store in-place. `LOGOUT` resets all slices simultaneously by passing `undefined` to the root reducer.

## API Layer

All requests are raw GraphQL strings sent via Axios POST to `/graphql`. An Axios interceptor injects `Authorization: Bearer <token>` on every request except public auth operations.

| File | Operations |
|---|---|
| `authApi.ts` | loginUser, registerUser, forgotPassword, resetPassword |
| `userApi.ts` | getProfile, getUsers, updateProfile, deleteUser, promoteToAdmin |
| `clientApi.ts` | getClients, addClient, updateClient, assignAdmin, confirmDeleteClient, deleteClientBySuperAdmin, forceDeleteClient |
| `projectApi.ts` | getProjects, addProject, updateProject, deleteProject, addUserToProject, removeUserFromProject |
| `taskApi.ts` | getTasks, createTask, updateTask, updateTaskStatus, deleteTask |
| `subTaskApi.ts` | getSubTasks, createSubTask, updateSubTask, updateSubTaskStatus, deleteSubTask |
| `notificationApi.ts` | getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications |
| `preferenceApi.ts` | getPreference, updatePreference |

## Frontend Project Structure

```
frontend/src/
├── api/                  # Axios GraphQL callers (8 API files)
├── queries/              # Raw GraphQL query strings
├── mutations/            # Raw GraphQL mutation strings
├── types/                # TypeScript interfaces for all entities
├── redux/
│   ├── store/            # Root store with LOGOUT reset pattern
│   ├── reducers/         # 9 reducers (auth, profile, users, clients, etc.)
│   ├── actions/          # Thunk actions (fetch + mutate)
│   └── constants/        # Action type string constants
├── Screens/
│   ├── Auth/             # Login, Register, ForgotPassword, ResetPassword
│   ├── Dashboard/        # Dashboard, Account, Users, Clients, Projects,
│   │                     #   Tasks, Kanban, Analytics
│   ├── Components/       # AppLayout, Sidebar, SiteHeader, ProfileContent,
│   │                     #   AnalyticsDashboard, NavUser, NavMain
│   ├── ui-Components/    # Shared auth form components
│   └── RouteHandler/     # ProtectedRoute (token + role) & PublicRoute
├── components/
│   ├── ui/               # 19 shadcn/ui components
│   ├── hooks/            # use-mobile.tsx
│   └── lib/              # cn() utility
├── App.tsx               # Root with Router + Redux + QueryClient providers
└── main.tsx              # Entry point
```

## Frontend Roadmap

- [ ] Comment system (add/view comments on tasks)
- [ ] E2E / integration tests (Playwright)
- [ ] Real-time task updates via GraphQL subscription (currently polling)
- [ ] Mobile-responsive layout improvements
