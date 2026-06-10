# ProjoMan — Project Management App

A full-stack project management application. Production-grade GraphQL API on the backend, React SPA on the frontend.

---

## Repository Structure

```
projectManagement/
├── server/       # Node.js GraphQL API (see Backend section)
├── frontend/     # React + TypeScript SPA (see Frontend section)
└── docs/         # Architecture docs (AWS_ARCHITECTURE.md, etc.)
```

---

---

# Backend

A GraphQL-first backend built on Node.js with a clean layered architecture, role-based access control, async job processing, Redis caching, and full observability.

## Backend Status

| Area                                                              | Status                                               |
| ----------------------------------------------------------------- | ---------------------------------------------------- |
| GraphQL API (Users, Clients, Projects, Tasks, SubTasks)           | Complete                                             |
| Authentication (JWT, login throttling, account lockout)           | Complete                                             |
| Role-Based Access Control (SUPER_ADMIN, CLIENT_ADMIN, USER)       | Complete                                             |
| Redis Caching (entity-level + pattern invalidation)               | Complete                                             |
| Async Notification System (BullMQ + Worker)                       | Complete                                             |
| Unit Tests (Jest + mocks, all service domains)                    | Complete                                             |
| Structured Logging (Pino, per-request child loggers, audit trail) | Complete                                             |
| Prometheus Metrics + Grafana Dashboards                           | Complete                                             |
| Docker (dev + prod profiles, worker as separate container)        | Complete                                             |
| CPU Clustering (production multi-process)                         | Complete                                             |
| User Preferences (theme, language)                                | Complete                                             |
| Comment System                                                    | Model defined — service/resolver integration pending |
| GraphQL Subscriptions (real-time)                                 | Planned                                              |
| E2E Testing                                                       | Planned                                              |
| CI/CD (GitHub Actions)                                            | Planned                                              |

## Backend Tech Stack

| Layer            | Technology                                                   |
| ---------------- | ------------------------------------------------------------ |
| Runtime          | Node.js 20 (ESM)                                             |
| API              | Apollo Server 5 — GraphQL only, no REST                      |
| Database         | MongoDB via Mongoose                                         |
| Cache            | Redis 7 (ioredis)                                            |
| Job Queue        | BullMQ                                                       |
| Auth             | JWT (jsonwebtoken) + bcryptjs                                |
| Validation       | Zod                                                          |
| Logging          | Pino                                                         |
| Metrics          | prom-client (Prometheus) + Grafana                           |
| Testing          | Jest with `unstable_mockModule` for ESM                      |
| Containerisation | Docker + Docker Compose                                      |
| Security         | Helmet, CORS, rate limiting, query depth + complexity limits |

## Getting Started (Backend)

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- A running MongoDB instance (or Atlas URI)

### Environment Variables

Copy `.env.local` and populate:

| Variable     | Description                          |
| ------------ | ------------------------------------ |
| `NODE_ENV`   | `development` or `production`        |
| `PORT`       | API port (default `8000`)            |
| `MONGO_URI`  | MongoDB connection string            |
| `SECRET_KEY` | JWT signing secret (min 32 chars)    |
| `REDIS_HOST` | Redis hostname (default `localhost`) |
| `REDIS_PORT` | Redis port (default `6379`)          |

### Running Locally (Docker)

```bash
# Development — hot reload, Prometheus + Grafana included
docker compose --profile dev up

# Production — optimised multi-stage build
docker compose --profile prod up
```

| Service            | URL                                 |
| ------------------ | ----------------------------------- |
| GraphQL API        | http://localhost:8000/graphql       |
| Prometheus Metrics | http://localhost:9090/metrics       |
| Prometheus         | http://localhost:9091               |
| Grafana            | http://localhost:3001 (admin/admin) |

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

# Single test by name
node --experimental-vm-modules node_modules/.bin/jest tests/task.test.js --verbose -t "should notify"
```

Tests use Jest with `unstable_mockModule` to mock at the repository boundary — no real DB or Redis connection required.

## Architecture Overview

```
Client Request
      │
      ▼
Apollo Server (server.js)
  ├─ JWT verification (all non-public operations)
  ├─ Query depth limit (max 7)
  ├─ Query complexity limit (max 1000)
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
  ├─ Enqueue async jobs (BullMQ)  ──► Notification Worker    │
  └─ Write audit logs                                         │
      │                                                       │
      ▼                                                       │
Repositories (Mongoose wrappers, return .toObject())         │
      │                                                       │
      ▼                                                       │
MongoDB                                                       │
                                                              │
Prometheus Plugin ◄───────────────────────────────────────────┘
  └─ graphql_requests_total
  └─ graphql_request_duration_ms
```

### Role Model

| Role           | Capabilities                                                                                                                                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPER_ADMIN`  | Full access — manages clients, users, projects, tasks; assigns CLIENT_ADMIN users to clients via `assignAdmin`; promotes USERs to CLIENT_ADMIN via `promoteToAdmin`; deletes users via `deleteUser`; queries all users via `users`/`user` |
| `CLIENT_ADMIN` | Manages their assigned client and its projects/tasks; queries users assigned to their client's projects via `users`/`user`                                                                                                                |
| `USER`         | Access to projects they are assigned to; can update their own tasks                                                                                                                                                                       |

### Public Operations (no JWT required)

`LoginMutation`, `RegisterMutation`, `ForgotPasswordMutation`, `ResetPasswordMutation`

### Notification Flow

1. A service calls `NotificationService.notify(userId, content)`
2. A job is enqueued to the BullMQ `notifications` queue (backed by Redis)
3. The standalone worker process (`worker/notification.worker.js`) consumes the job, persists the notification to MongoDB, and logs completion

## Backend Project Structure

```
server/
├── app.js                    # Bootstrap: DB, metrics server, cluster
├── cluster.js                # Production worker forking
├── server.js                 # Apollo Server, JWT context, plugins
├── config/
│   ├── env.js                # Zod env validation (fails fast on startup)
│   ├── db.js                 # MongoDB connection
│   ├── redis.js              # Redis client with retry + health check
│   ├── cache.js              # Cache wrapper (get/set/invalidate/pattern)
│   ├── logger.js             # Pino logger + DB index creation
│   └── metrics.js            # Prometheus counter + histogram
├── graphql/
│   ├── schema.js             # Root Query + Mutation definitions
│   ├── resolvers/            # 8 resolver files — delegate to services
│   └── types/                # 8 GraphQL type definitions
├── services/                 # Business logic (8 services)
├── repositories/             # DB access via Mongoose (8 repos)
├── models/                   # Mongoose schemas (9 models)
├── queues/                   # BullMQ queue definitions
├── worker/                   # Standalone notification worker
├── validation/               # Zod schemas + validate() helper
├── errors/                   # AppError hierarchy
├── middleware/               # Rate limiter
├── tests/                    # Jest unit tests (7 files)
└── docker/                   # Prometheus config, observability compose
```

## Backend Roadmap

- [ ] Comment system (model exists, needs service + resolver)
- [ ] GraphQL Subscriptions for real-time task/notification updates
- [ ] E2E test suite
- [ ] GitHub Actions CI/CD pipeline (lint, test, Docker build, deploy)
- [ ] AWS deployment (see `docs/AWS_ARCHITECTURE.md`)

---

---

# Frontend

A React + TypeScript SPA connecting to the GraphQL backend.

## Frontend Status

| Feature                     | Status                         |
| --------------------------- | ------------------------------ |
| Login                       | Complete                       |
| Register                    | Complete                       |
| JWT auth + protected routes | Complete                       |
| User profile (view)         | Complete                       |
| User profile (edit)         | UI built — API wire-up pending |
| Forgot / Reset password     | Pages exist — not implemented  |
| Dashboard stats cards       | UI built — static data         |
| Dark mode                   | Supported                      |
| Tasks page                  | Not started                    |
| Projects page               | Not started                    |
| Analytics page              | Not started                    |
| Team page                   | Not started                    |

## Frontend Tech Stack

| Layer         | Technology                                                    |
| ------------- | ------------------------------------------------------------- |
| Framework     | React 18 + TypeScript 5                                       |
| Build         | Vite 4 (dev port: **4000**)                                   |
| Routing       | React Router 6                                                |
| UI components | shadcn/ui + Radix UI primitives                               |
| Styling       | Tailwind CSS 3 (dark mode via `class`, CSS variables)         |
| State         | Redux Toolkit + Redux Thunk (auth, profile)                   |
| Server state  | React Query 3                                                 |
| API           | Axios → raw GraphQL strings → `http://localhost:8000/graphql` |
| Icons         | Tabler Icons + Lucide React                                   |

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

| Path         | Page              | Guard                                        |
| ------------ | ----------------- | -------------------------------------------- |
| `/`          | Login             | Public (redirects to `/dashboard` if authed) |
| `/register`  | Register          | Public                                       |
| `/dashboard` | Dashboard         | Protected                                    |
| `/account`   | Account / Profile | Protected                                    |

## Frontend Project Structure

```
frontend/src/
├── api/              # Axios GraphQL callers (authApi.ts, userApi.ts)
├── queries/          # Raw GraphQL query strings
├── mutations/        # Raw GraphQL mutation strings
├── types/            # TypeScript interfaces for API payloads
├── redux/
│   ├── store/        # Redux store (JWT validated on startup)
│   ├── reducers/     # authLoginReducer, authRegisterReducer, profileReducer
│   ├── actions/      # Thunk actions (fetchProfile, logout)
│   └── constants/    # Action type constants
├── Screens/
│   ├── Auth/         # Login, Register, ForgotPassword, ResetPassword
│   ├── Dashboard/    # Dashboard, Account
│   ├── Components/   # Sidebar, header, nav, section cards, profile UI
│   ├── ui-Components/# Shared form components
│   └── RouteHandler/ # ProtectedRoute & PublicRoute HOCs
├── components/
│   ├── ui/           # 19 shadcn/ui components
│   ├── hooks/        # use-mobile.tsx
│   └── lib/          # cn() utility
├── App.tsx           # Root with Router + Redux + QueryClient providers
└── main.tsx          # Entry point
```

## Frontend Roadmap

- [ ] Wire up profile edit form to `updateProfile` mutation
- [ ] Implement Forgot / Reset password flows
- [ ] Tasks page
- [ ] Projects page
- [ ] Analytics page
- [ ] Team page
- [ ] Replace static dashboard cards with real data
