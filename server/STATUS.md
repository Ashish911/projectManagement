# Server Status

**Version**: 1.0.0  
**Runtime**: Node.js 20 (ES Modules)  
**Last Updated**: 2026-10-02

---

## Implementation Status

### Core Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| GraphQL API (Apollo Server 5) | ✅ Complete | HTTP + WebSocket on single port |
| MongoDB (Mongoose 7) | ✅ Complete | Full ODM with schema transforms |
| Redis (ioredis 5) | ✅ Complete | Caching + PubSub + BullMQ queues |
| JWT Authentication | ✅ Complete | HS256, 1-hour expiry, public op whitelist |
| Rate Limiting | ✅ Complete | Per-IP in dev; infrastructure-level in prod |
| Cluster Mode | ✅ Complete | One worker per CPU core outside dev; exited workers re-forked (no back-off) |
| Graceful Shutdown | ✅ Complete | SIGTERM/SIGINT drain HTTP + WebSocket |
| Environment Validation | ✅ Complete | Zod-validated at startup; exits on failure |
| Structured Logging (Pino) | ✅ Complete | Pretty in dev, JSON in prod; per-request child loggers with `userId`; secrets redacted |
| Prometheus Metrics | ✅ Complete | Requests (success / error / unauthenticated), latency, cache hits/misses at `:9090/metrics`; aggregated across workers in cluster mode |
| Health Checks | ✅ Complete | `/health/live` and `/health/ready` on port 8000; ready fails only if MongoDB is down |
| Crash Logging | ✅ Complete | `unhandledRejection` / `uncaughtException` logged as fatal before exit |
| Query Depth Limiting | ✅ Complete | Max depth: 7 |
| Introspection Control | ✅ Complete | Disabled in production |

### Features

| Feature | Status | Notes |
|---------|--------|-------|
| User Auth (login / register) | ✅ Complete | Bcrypt hashing, lockout after 5 failed attempts (1hr); sign-up always creates `USER`; same error for unknown email and wrong password |
| Password Reset | ✅ Complete | Reset link emailed via Bird; token stored as SHA-256 hash; 1-hour expiry; no account enumeration |
| Role-Based Access Control | ✅ Complete | SUPER_ADMIN / CLIENT_ADMIN / USER; enforced in service layer |
| User Management | ✅ Complete | Profile update, promote to admin, delete user |
| Client Management | ✅ Complete | CRUD + soft-delete request flow + force delete |
| Project Management | ✅ Complete | CRUD + bulk user assignment / removal |
| Task Management | ✅ Complete | CRUD + status transitions + priority levels |
| SubTask Management | ✅ Complete | CRUD + status transitions; linked to parent task |
| Real-Time Notifications | ✅ Complete | WebSocket subscriptions via Redis PubSub |
| Notification Management | ✅ Complete | Mark read, mark all read, delete, delete all |
| User Preferences | ✅ Complete | Theme (LIGHT/DARK) + Language (EN/JA/KO) |
| Audit Logging | ✅ Complete | Create/update/delete and auth events (login, failed login, register, password reset) logged with userId + action |
| Response Caching | ✅ Complete | Redis-backed; 5-min TTL; cache-aside with invalidation on write |
| Async Notification Queue | ⚠️ Partial | BullMQ queue + worker exist; not yet wired into main notify flow |
| Email Delivery | ✅ Complete | Bird (`@messagebird/sdk`) in `services/email.service.js`; password reset only |
| File Uploads | ❌ Not implemented | — |
| Comments | ⚠️ Model only | `Comment` Mongoose model exists; no resolver or service implemented |
| Observability Stack | ✅ Complete (dev) | Prometheus with alert rules + Grafana with provisioned "ProjoMan API" dashboard, in the `dev` compose profile |

---

## Test Coverage

Tests live in `server/tests/`. Each suite mocks at the repository boundary using `jest.unstable_mockModule`.

| Suite | File | Scope |
|-------|------|-------|
| Auth | `auth.test.js` | login, register, forgotPassword, resetPassword, updateProfile, promoteToAdmin, deleteUser, lockout logic, auth audit logging |
| Client | `client.test.js` | addClient, updateClient, deleteClientRequest, deleteClientBySuperAdmin, forceDeleteClient, assignAdmin, role checks |
| Project | `project.test.js` | addProject, updateProject, deleteProject, addUserToProject, removeUserFromProject, role-scoped queries |
| Task | `task.test.js` | createTask, updateTask, updateTaskStatus, deleteTask, cascade to SubTasks |
| SubTask | `subTask.test.js` | createSubTask, updateSubTask, updateSubTaskStatus, deleteSubTask |
| Notification | `notification.test.js` | notify, getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications |
| Preference | `preference.test.js` | getPreference (cache hit/miss), updatePreference |
| Server | `server.test.js` | `buildHttpContext`: public ops, JWT decoding, operation-name handling, unauthenticated counting |

**Run all tests:**
```bash
cd server && npm test
```

**Run a single suite:**
```bash
npm run test:auth
npm run test:client
npm run test:project
npm run test:task
npm run test:subTask
npm run test:notification
npm run test:preference
npm run test:server
```

> Tests require `--experimental-vm-modules` (already configured in package.json scripts). Always mock `../config/cache.js` in test suites — a live Redis connection will bleed cache state between tests.

---

## Architecture Overview

```
GraphQL Request
    │
    ▼
server.js  ←── JWT auth, rate limit, per-request context (reqId, logger, user)
    │
    ▼
Resolver   ←── thin delegation only; no business logic
    │
    ▼
Service    ←── role checks, Zod validation, business rules, audit logging
    │
    ▼
Repository ←── Mongoose CRUD; always returns .toObject()
    │
    ▼
Model      ←── Mongoose schema + transforms (_id→id, removes __v)
```

**Side channels:**
- `config/cache.js` — Redis cache layer used by services for read acceleration
- `config/pubsub.js` — Redis PubSub used by NotificationService for real-time subscription delivery
- `queues/notification.queue.js` + `worker/notification.worker.js` — BullMQ async processing (available, not yet active)
- `config/metrics.js` + `config/health.js` — Prometheus metrics and readiness checks

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| GraphQL Server | Apollo Server | 5.4.0 |
| HTTP Framework | Express | 5.2.1 |
| WebSocket Protocol | graphql-ws + ws | 6.0.8 |
| Database | MongoDB via Mongoose | 7.4.2 |
| Cache / PubSub / Queue | Redis via ioredis + BullMQ | 5.10.1 / 5.73.5 |
| Authentication | jsonwebtoken | 9.0.2 |
| Password Hashing | bcryptjs | 2.4.3 |
| Validation | Zod | 4.3.6 |
| Logging | Pino | 10.3.1 |
| Metrics | prom-client | 15.1.3 |
| Security | cors, graphql-depth-limit | — |
| Runtime | Node.js | 20 (Alpine in Docker) |

---

## Environment Variables

Validated at startup by `config/env.js` via Zod. The process exits immediately if any required variable is missing or invalid.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ | — | `development` \| `production` \| `test` |
| `PORT` | — | `8000` | HTTP server port |
| `MONGO_URI` | ✅ | — | MongoDB connection string |
| `SECRET_KEY` | ✅ (min 32 chars) | — | JWT signing secret |
| `REDIS_HOST` | — | `localhost` | Redis hostname (set to `redis` in Docker) |
| `REDIS_PORT` | — | `6379` | Redis port |
| `REDIS_PASSWORD` | — | — | Redis password |
| `CORS_ORIGIN` | — | `*` | Allowed CORS origin(s) |
| `METRICS_PORT` | — | `9090` | Prometheus metrics port |
| `BIRD_API_KEY` | — | — | Bird API key; without it reset emails are not sent |
| `EMAIL_FROM` | — | `onboarding@messagebird.dev` | Sender address |
| `APP_URL` | — | `http://localhost:4000` | Frontend base URL for reset links |

Only the first four are validated by Zod; the rest are read directly from `process.env`.

Dev env: `.env.local` · Prod env: `.env.prod`

---

## Known Issues / Limitations

- **Bird sandbox sender**: `onboarding@messagebird.dev` is Bird's test sender. Production needs a verified sending domain set in `EMAIL_FROM`.
- **`Comment` model without resolver**: The `Comment` Mongoose model exists but has no matching GraphQL type, resolver, or service. Either implement or remove.
- **Async notification worker not wired**: `queues/notification.queue.js` and `worker/notification.worker.js` exist but `NotificationService.notify()` publishes directly to Redis PubSub rather than the queue. The worker service in `docker-compose.yml` is also commented out.
- **Production `volumes` mount in docker-compose**: Both `app` and `app-prod` mount `.:/app`, which overlays source code at runtime. For `app-prod` this mount is also what provides `.env.prod` (excluded from the image by `.dockerignore`), so removing it requires passing env vars another way, e.g. `env_file` plus `node app.js`.
- **User cache invalidation gaps**: `register`, `deleteUser` and `promoteToAdmin` don't invalidate `users:all` / `users:<id>`, so SUPER_ADMIN reads can be stale for up to 5 minutes. Cached user objects also include password hashes and reset tokens.
- **No Redis memory limit**: `maxmemory` is unset (`noeviction`); the 5-minute TTL keeps it small for now. A cache-only production instance should use `allkeys-lru`; BullMQ needs `noeviction`.
- **3 failing tests**: two `getClient` tests in `client.test.js` and one `getPreference` test in `preference.test.js` fail when a local Redis is running, because those suites use the real cache.

---

## Running Locally

```bash
# Install dependencies
cd server && npm install

# Development (nodemon, .env.local)
npm run dev

# With Docker (dev profile — includes Redis)
docker compose --profile dev up

# Production (cluster mode, .env.prod)
npm start

# With Docker (prod profile)
docker compose --profile prod up
```
