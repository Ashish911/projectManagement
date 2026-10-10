# Server Status

**Version**: 1.0.0  
**Runtime**: Node.js 20 (ES Modules)  
**Last Updated**: 2026-10-06

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
| Task Management | ✅ Complete | CRUD + status transitions + priority levels; `allTasks` (role-scoped across projects); `createdAt`/`resolvedAt`/`subTaskStats` for dashboards; clearable deadline and assignee |
| User Administration | ✅ Complete | SUPER_ADMIN: `createUser` (invite email or temporary password), `updateUser`, `changeUserRoles`, `unlockUsers`, `resendInvite`, `deleteUsers`; derived `status` (ACTIVE / LOCKED / INVITED), `lastLoginAt`; any user: `changePassword` |
| Client Deletion Review | ✅ Complete | CLIENT_ADMIN requests; SUPER_ADMIN approves or `declineClientDeletion` with a message |
| SubTask Management | ✅ Complete | CRUD + status transitions; linked to parent task |
| Real-Time Notifications | ✅ Complete | `notificationCreated` over WebSocket via Redis PubSub; token checked once on connect (bad token → close 4403) |
| Notification Management | ✅ Complete | Mark one read, `markAllAsRead` and `markNotificationsRead(ids)` as single writes scoped to the caller, delete, delete all; list is newest first and empty instead of an error |
| User Preferences | ✅ Complete | Theme (LIGHT/DARK) + Language (EN/JA/KO) |
| Audit Logging | ✅ Complete | Create/update/delete and auth events (login, failed login, register, password reset) logged with userId + action |
| Response Caching | ✅ Complete | Redis-backed; 5-min TTL; cache-aside with invalidation on write |
| Database Indexes | ✅ Complete | Declared in the schemas only (`models/`), one per repository query path; `autoIndex` off in production, applied by `npm run db:indexes:prod` (`scripts/sync-indexes.js`). Every listed query verified as `IXSCAN`. See `docs/SYSTEM_DESIGN.md` §7 |
| Async Notification Queue | ✅ Complete | `notify()` enqueues to BullMQ (3 attempts, exponential back-off); the worker container calls `deliver()` (save + publish); falls back to delivering directly if the queue is unreachable for 3s |
| Email Delivery | ✅ Complete | Bird (`@messagebird/sdk`) in `services/email.service.js`; password reset and invites |
| File Uploads | ❌ Not implemented | — |
| Comments | ✅ Complete | On tasks and subtasks; project members only (assigned users, the client's CLIENT_ADMIN, SUPER_ADMIN); author edits; author or admin deletes; notifies assignee + creator; cascade-deleted with task/subtask |
| Observability Stack | ✅ Complete (dev) | Prometheus with alert rules + Grafana with provisioned "ProjoMan API" dashboard, in the `dev` compose profile |

---

## Test Coverage

Tests live in `server/tests/`. Each suite mocks at the repository boundary using `jest.unstable_mockModule`.

| Suite | File | Scope |
|-------|------|-------|
| Auth | `auth.test.js` | login, register, forgotPassword, resetPassword, updateProfile, promoteToAdmin, deleteUser, lockout logic, auth audit logging |
| Client | `client.test.js` | addClient, updateClient, deleteClientRequest, deleteClientBySuperAdmin, forceDeleteClient, assignAdmin, role checks |
| Project | `project.test.js` | addProject, updateProject, deleteProject, addUserToProject, removeUserFromProject, role-scoped queries |
| Task | `task.test.js` | createTask, updateTask, updateTaskStatus, deleteTask, cascade to SubTasks and Comments |
| SubTask | `subTask.test.js` | createSubTask, updateSubTask, updateSubTaskStatus, deleteSubTask, cascade to Comments |
| Comment | `comment.test.js` | list/add on tasks and subtasks, project-membership checks, author-only edit, delete moderation, notification recipients, content validation |
| Notification | `notification.test.js` | notify → queue, fallback when the queue fails or hangs, deliver (save + publish), worker job, getNotifications, markAsRead, markAllAsRead / markNotificationsRead (one write, caller-scoped), delete, delete all |
| Indexes | `indexes.test.js` | Every query path has a declared index; partial unique client email; no duplicate key patterns; `autoIndex` off in production; sync script (legacy renames, dry run, per-model failures) |
| GraphQL types | `graphqlTypes.test.js` | `ClientType.email` / `phone` nullable |
| User admin | `userAdmin.test.js` | createUser (invite / password), updateUser, changeUserRoles, unlockUsers, resendInvite, deleteUsers, changePassword |
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
- `queues/notification.queue.js` + `worker/notification.worker.js` — BullMQ notification delivery: `notify()` enqueues, the worker process runs `deliver()`
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

Severity reflects risk in production:
- **High:** security or data isolation.
- **Medium:** correctness or availability.
- **Low:** operational polish.

Each row names the fix we'd recommend. None are fixed yet.

| # | Severity | Area | Issue and impact | Recommended fix |
|---|---|---|---|---|
| S-1 | **High** | Access control | **`updateClient` saves every field it is sent.** A `CLIENT_ADMIN` editing their own client can also change `assignedAdmin` (hand the client to someone else) or set `deleteRequest`. The ownership check also uses `==` instead of `===`. | Whitelist `name` / `email` / `phone` for `CLIENT_ADMIN`; keep `assignedAdmin` behind `assignAdmin`; use strict equality on `String(id)`. |
| S-2 | **High** | Tenant isolation | **`tasks`, `task`, `subTasks` and `subTask` don't scope `CLIENT_ADMIN` to their client.** Any client admin who knows an id can read another client's tasks. Comments and `allTasks` already check ownership. | Reuse the project-membership check from `comment.service.js` (`assertProjectAccess` / `isProjectClientAdmin`) in the task and sub-task read paths, with tests for a foreign `CLIENT_ADMIN`. |
| S-3 | Medium | Caching | **User cache invalidation gaps.** `register`, `deleteUser` and `promoteToAdmin` don't call `invalidateUsers()`, so SUPER_ADMIN lists can be up to 5 minutes stale. Cached user objects also include password hashes and reset tokens. | Call `invalidateUsers()` in those three methods; strip `password` / `resetToken*` before caching. |
| S-4 | Medium | Notifications | **Rare duplicate notification.** If `queue.add` times out after 3 s but Redis accepts the job later, the notification is delivered twice. | Deterministic `jobId` (e.g. hash of user + content + minute) and an idempotent `deliver()`. |
| S-5 | Medium | Operations | **The worker must be deployed everywhere.** Compose runs `worker` / `worker-prod`; any other deployment (e.g. AWS) must run `node worker/notification.worker.js`, or queued notifications wait. | Add the worker to every deployment manifest; alert on queue depth / job age. |
| S-6 | Low | Notifications | **Slow `notify()` during a Redis outage.** Notifying mutations wait up to 3 s before falling back to direct delivery. | Acceptable for now; lower the timeout or open a circuit after repeated failures. |
| S-7 | Low | Redis | **No memory limit.** `maxmemory` is unset (`noeviction`). BullMQ requires `noeviction`; a cache-only instance would want `allkeys-lru`. | Set `maxmemory`; split cache and queue Redis if memory pressure appears. |
| S-8 | Low | Docker | **`app-prod` mounts `.:/app`.** This overlays the image's source at runtime; the mount is also what supplies `.env.prod` (excluded by `.dockerignore`). | Pass env via `env_file` and run `node app.js`; drop the source mount. |
| S-9 | Low | Email | **Bird sandbox sender.** `onboarding@messagebird.dev` is Bird's test sender. | Verify a sending domain and set `EMAIL_FROM` in production. |
| S-10 | Medium | Operations | **Production indexes must be synced once.** With `autoIndex` off in production, the new indexes don't exist there until `npm run db:indexes:prod` runs; until then tasks, sub-tasks and notifications are unindexed and the old non-partial client email index still blocks a second client without an email. | Run `npm run db:indexes:prod -- --dry-run`, review, then run it for real; add it to the deploy pipeline. |

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
