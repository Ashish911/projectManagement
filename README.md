# ProjoMan — Project Management API

A production-grade, GraphQL-first project management backend built on Node.js. Designed with a clean layered architecture, role-based access control, async job processing, Redis caching, and full observability out of the box.

---

## Status

| Area | Status |
|---|---|
| GraphQL API (Users, Clients, Projects, Tasks, SubTasks) | Complete |
| Authentication (JWT, login throttling, account lockout) | Complete |
| Role-Based Access Control (SUPER_ADMIN, CLIENT_ADMIN, USER) | Complete |
| Redis Caching (entity-level + pattern invalidation) | Complete |
| Async Notification System (BullMQ + Worker) | Complete |
| Unit Tests (Jest + mocks, all service domains) | Complete |
| Structured Logging (Pino, per-request child loggers, audit trail) | Complete |
| Prometheus Metrics + Grafana Dashboards | Complete |
| Docker (dev + prod profiles, worker as separate container) | Complete |
| CPU Clustering (production multi-process) | Complete |
| User Preferences (theme, language) | Complete |
| Comment System | Model defined — service/resolver integration pending |
| GraphQL Subscriptions (real-time) | Planned |
| E2E Testing | Planned |
| CI/CD (GitHub Actions) | Planned |
| Frontend (React) | In progress |

---

## Tech Stack

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
| Security | Helmet, CORS, rate limiting, query depth + complexity limits |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- A running MongoDB instance (or Atlas URI)

### Environment Variables

Copy `.env.local` and populate the required values:

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `PORT` | API port (default `8000`) |
| `MONGO_URI` | MongoDB connection string |
| `SECRET_KEY` | JWT signing secret (min 32 chars) |
| `REDIS_HOST` | Redis hostname (default `localhost`) |
| `REDIS_PORT` | Redis port (default `6379`) |

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
| Prometheus Metrics | http://localhost:9090/metrics |
| Prometheus | http://localhost:9091 |
| Grafana | http://localhost:3001 (admin/admin) |

### Running Without Docker

```bash
cd server
npm install
npm run dev       # development (uses .env.local)
npm run start     # production (uses .env.prod)
```

---

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

---

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

| Role | Capabilities |
|---|---|
| `SUPER_ADMIN` | Full access — manages clients, users, projects, tasks |
| `CLIENT_ADMIN` | Manages their assigned client and its projects/tasks |
| `USER` | Access to projects they are assigned to; can update their own tasks |

### Public Operations (no JWT required)

`LoginMutation`, `RegisterMutation`, `ForgotPasswordMutation`, `ResetPasswordMutation`

### Notification Flow

1. A service calls `NotificationService.notify(userId, content)`
2. A job is enqueued to the BullMQ `notifications` queue (backed by Redis)
3. The standalone worker process (`worker/notification.worker.js`) consumes the job, persists the notification to MongoDB, and logs completion

This decouples notification delivery from the request lifecycle — a slow notification never blocks the API response.

---

## Project Structure

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

---

## Roadmap

- [ ] Comment system (model exists, needs service + resolver)
- [ ] GraphQL Subscriptions for real-time task/notification updates
- [ ] E2E test suite
- [ ] GitHub Actions CI/CD pipeline (lint, test, Docker build, deploy)
- [ ] Frontend (React) — in progress
- [ ] AWS deployment (see `docs/AWS_ARCHITECTURE.md`)
