# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack project management application. Active development is in `server/` (Node.js GraphQL API). The `frontend/` directory also exists but is not covered here.

All commands below are run from inside `server/`.

## Commands

```bash
# Development (uses .env.local)
npm run dev

# Production (uses .env.prod)
npm run start

# Run all tests (watch mode)
npm test

# Run a single test file
npm run test:auth
npm run test:client
npm run test:task
npm run test:project
npm run test:subTask
npm run test:notification
npm run test:preference
npm run test:server

# Run a specific test by name (no dedicated script — use jest directly)
node --experimental-vm-modules node_modules/.bin/jest tests/client.test.js --verbose -t "should add a client"
```

Tests require `--experimental-vm-modules` because the project uses ES modules (`"type": "module"` in package.json).

## Required Environment Variables

Validated at startup via Zod in `config/env.js`. The server will exit on missing/invalid values.

| Variable | Requirement |
|---|---|
| `NODE_ENV` | `development` \| `production` \| `test` |
| `PORT` | defaults to `8000` |
| `MONGO_URI` | required |
| `SECRET_KEY` | min 32 characters |

Optional, not validated by Zod: `REDIS_HOST` (default `localhost`), `REDIS_PORT` (`6379`), `REDIS_PASSWORD`, `CORS_ORIGIN` (`*`), `METRICS_PORT` (`9090`), `BIRD_API_KEY` (password-reset email; without it no email is sent), `EMAIL_FROM` (`onboarding@messagebird.dev`), `APP_URL` (frontend base for reset links, `http://localhost:4000`).

Dev env is `.env.local`, prod env is `.env.prod`. Both are git-ignored (`.env*`); `server/.env.example` is the committed template. Never commit real env files.

## Architecture

### Request Flow

```
GraphQL Request → server.js (JWT auth, rate limit, context) → Resolver → Service → Repository → Mongoose Model
```

- **`app.js`** — bootstrap: connects DB, starts the `:9090` metrics server (in the cluster primary outside dev), logs fatal crashes, starts Apollo or cluster
- **`cluster.js`** — forks N workers (= CPU count) outside dev and re-forks any worker that exits (no back-off)
- **`server.js`** — Apollo Server on Express: `buildHttpContext` (JWT auth, request logger), query depth limit (7), error formatting, Prometheus plugin, health routes

### Key Architectural Decisions

**GraphQL-only API.** No REST endpoints, except the unauthenticated `/health/live` and `/health/ready` probes on the API port. Apollo Server is mounted on Express with `expressMiddleware`, sharing its port with the `graphql-ws` WebSocket server. Introspection is disabled in production.

**Public operations whitelist.** JWT auth is skipped only for operations named exactly: `LoginMutation`, `RegisterMutation`, `ForgotPasswordMutation`, `ResetPasswordMutation`. All other operations require a `Bearer` token; failures return `UNAUTHORIZED` with HTTP 401.

**Public auth rules.** `register` has no `role` argument and always creates a `USER`. `login` returns the same "Invalid email or password" for an unknown email and a wrong password. `forgotPassword` always returns the same message and `token: null`; the raw token is only sent by email (`services/email.service.js`, Bird) and stored as a SHA-256 hash in `resetToken`.

**Roles.** Three roles: `SUPER_ADMIN`, `CLIENT_ADMIN`, `USER`. Role checks live in the service layer, not resolvers. Use strict equality (`===`) when comparing roles.

| Role | Key capabilities |
|---|---|
| `SUPER_ADMIN` | Full access — manages all clients, users, projects, tasks; `assignAdmin` (assign CLIENT_ADMIN to a client); `promoteToAdmin` (USER → CLIENT_ADMIN); `deleteUser`; queries all users |
| `CLIENT_ADMIN` | Manages their assigned client and its projects/tasks; queries users in their client's projects |
| `USER` | Access to assigned projects only; can update own tasks |

**Layered architecture.**
- `graphql/resolvers/` — thin, delegate immediately to services
- `services/` — all business logic and role checks
- `repositories/` — all Mongoose access; return `.toObject()` for clean serialization
- `models/` — Mongoose schemas only

**Caching.** Redis-backed via `config/cache.js`. Cache keys follow the pattern `entity:id` or `entity:all`. Always invalidate on write. Cache is set *before* access control checks on the DB path in some services — be careful when modifying `getClient`-style methods. Always mock `../config/cache.js` in tests when Redis is running locally — otherwise `cache.get` returns real data and bleeds between tests.

**Field naming.** The Mongoose `Project` model field is `assignedUsers` (plural). Services, resolvers, and tests must all use `assignedUsers` — never the singular `assignedUser`. The GraphQL field exposed to API consumers is named `user` (in `graphql/types/project.type.js`).

**GraphQL type resolvers.** When returning Mongoose query results from a `resolve()` function, always use `async/await` — never return a raw Mongoose Query object. Returning a Query (a thenable) causes GraphQL's executor to call `.then()` on it, which can re-execute the query and throw `MongooseError: Query was already executed`.

**Notifications.** `NotificationService.notify()` saves the notification to MongoDB and publishes it via Redis PubSub for the `notificationCreated` subscription. It does not use the BullMQ queue yet: `queues/notification.queue.js` and `worker/notification.worker.js` exist, but nothing adds jobs. In tests, mock `../services/notification.service.js` directly.

**Error handling.** Custom error classes in `errors/` extend `AppError`. Throw these in services; Apollo's `formatError` maps them to structured GraphQL responses with `extensions.code` and `extensions.statusCode`.

**Validation.** All service inputs validated via Zod schemas in `validation/schema.js` using `validate()` from `validation/validate.js`. All MongoDB IDs validated with the `objectId` regex before any DB call.

### Testing Conventions

Tests are in `server/tests/`. They mock at the repository boundary using `jest.unstable_mockModule()` — import the service *after* setting up all mocks. Pattern:

```js
const mockFind = jest.fn();
jest.unstable_mockModule("../repositories/foo.repo.js", () => ({ FooRepo: { find: mockFind } }));
const { FooService } = await import("../services/foo.service.js");
```

Each test suite clears mocks in `beforeEach(() => jest.clearAllMocks())`.

Test names use `🟢` for happy paths and `🔴` for failure/rejection cases.

### Docker

`docker-compose.yml` has two profiles: `dev` and `prod`.

- **dev**: app (nodemon, ports 8000 + 9090) + redis + prometheus (port 9091) + grafana (port 3001)
- **prod**: app-prod (multi-stage build) + redis

A `worker` service for `worker/notification.worker.js` is defined but commented out, since nothing enqueues notification jobs yet. Redis persists RDB snapshots to the `redis-data` volume.

### Observability

- Logs: Pino, pretty-printed in dev, structured JSON in prod. Per-request child loggers via `logger.child({ reqId, operation, ip })`, plus `userId` once the JWT is verified. Secret fields (`password`, `token`, `resetToken`, `authorization`) are redacted.
- The HTTP context builder is `buildHttpContext` in `server.js`. Public operations also get a context (with `user: null`), so they are logged and counted. Operation names that are not plain identifiers (`/^\w{1,64}$/`) become `"unknown"`, because the name is a metric label.
- Metrics: Prometheus at `:9090/metrics` (`METRICS_PORT`). Custom metrics: `graphql_requests_total` (counter, labels `operation` and `status`: success / error / unauthenticated), `graphql_request_duration_ms` (histogram, `operation`), `cache_operations_total` (counter, `op` and `result`). In cluster mode the primary serves metrics aggregated from all workers via prom-client's `AggregatorRegistry`, which must be created in every process.
- Health: `/health/live` (process up) and `/health/ready` (503 only if MongoDB is down; Redis is reported but optional).
- Audit logs: written in services for create/update/delete and auth events (LOGIN, LOGIN_FAILED, REGISTER, PASSWORD_RESET_REQUESTED, PASSWORD_RESET, PASSWORD_RESET_FAILED) with `{ audit: true, userId, action }` fields. Never log passwords or tokens.
- Dev stack: Prometheus alert rules in `server/prometheus/alerts.yml`; Grafana data source and the "ProjoMan API" dashboard are provisioned from `server/grafana/`.
