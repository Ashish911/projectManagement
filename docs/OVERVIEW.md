# ProjoMan — System Overview

> A plain-English guide to what this system is, why it was built, and how it all fits together.

---

## Table of Contents

1. [What Is ProjoMan?](#1-what-is-projoman)
2. [Why Was This Built?](#2-why-was-this-built)
3. [Who Uses It?](#3-who-uses-it)
4. [How the System Works — The Big Picture](#4-how-the-system-works--the-big-picture)
5. [Technology Stack — What We Use and Why](#5-technology-stack--what-we-use-and-why)
6. [How Data Flows Through the System](#6-how-data-flows-through-the-system)
7. [Security — How We Keep Things Safe](#7-security--how-we-keep-things-safe)
8. [Notifications — Staying in the Loop](#8-notifications--staying-in-the-loop)
9. [Observability — Knowing What Is Happening](#9-observability--knowing-what-is-happening)
10. [What Is Still Being Built](#10-what-is-still-being-built)

---

## 1. What Is ProjoMan?

ProjoMan (short for **Project Manager**) is a web application that helps organisations manage their work — from high-level projects down to individual tasks and sub-tasks.

Think of it like a digital whiteboard where:

- A **company** (called a *Client* in the system) signs up.
- A **manager** (called a *Client Admin*) sets up projects for that company.
- **Team members** (called *Users*) are assigned to projects, pick up tasks, and track their progress.

Everything — creating tasks, updating statuses, assigning people, sending notifications — happens in real time through a single web page without needing to refresh the browser.

---

## 2. Why Was This Built?

Most project management tools are either:

- **Too complex** — built for enterprise teams with dozens of features most people never use, or
- **Too simple** — a basic to-do list with no collaboration features.

ProjoMan was built to sit in the middle: a **clean, role-aware, production-quality** project management system that a development team can run on their own infrastructure and extend freely.

The secondary purpose was to demonstrate a complete, end-to-end production system — showing how a modern Node.js backend with a React frontend should be structured, tested, and deployed.

---

## 3. Who Uses It?

There are three types of people in the system, called **roles**:

| Role | Who They Are | What They Can Do |
|---|---|---|
| **Super Admin** | The system owner / platform operator | Manages everything — creates companies (clients), promotes managers, has full access to all data |
| **Client Admin** | A manager at a company | Manages their company's projects, tasks, and team members |
| **User** | A regular team member | Works on tasks and sub-tasks they have been assigned to |

Each person only ever sees and does what their role allows. A regular user cannot see another company's data. A manager cannot touch another company's settings. This is enforced at the server — not just hidden in the interface.

---

## 4. How the System Works — The Big Picture

The data in ProjoMan is structured like a set of nested boxes:

```
Client (Company)
  └── Project (a piece of work the company is doing)
        └── Task (a specific job within that project)
              └── Sub-Task (a smaller step within that job)
```

**Example:**
- Client: "Acme Corp"
  - Project: "Website Redesign"
    - Task: "Design the homepage"
      - Sub-Task: "Create wireframes"
      - Sub-Task: "Review with stakeholder"
    - Task: "Write the copy"

Each task and sub-task can be assigned to a team member, given a deadline, a priority level (Urgent / High / Normal / Backlog), and a status (New / In Progress / Resolved / Reopened).

---

## 5. Technology Stack — What We Use and Why

This section explains every major technology in plain language, why it was chosen, and its trade-offs.

---

### 5.1 Node.js — The Server Runtime

**What it is:** Node.js lets you run JavaScript on a server (not just in a browser). JavaScript was originally a browser language; Node.js brought it to the server side.

**Why we use it:**
- **One language everywhere.** The frontend (browser) and the backend (server) are both written in JavaScript/TypeScript. Developers do not need to context-switch between two completely different languages.
- **Non-blocking I/O.** Node.js handles many requests at the same time without getting stuck waiting. When it asks the database for data, it does not sit and wait — it handles other requests in the meantime and comes back when the data is ready. This makes it very efficient for apps like ours where most work is reading from or writing to a database or cache.
- **Massive ecosystem.** npm (Node Package Manager) has hundreds of thousands of ready-made libraries that cover almost every need.
- **Fast to develop.** Great for building APIs quickly.

**Trade-offs:**
- Node.js runs on a single CPU core by default. Heavy mathematical work can block it. We address this with CPU clustering (running one Node.js process per CPU core in production).
- JavaScript's dynamic typing can introduce bugs. We address this with TypeScript on the frontend and with Zod validation on the backend.

---

### 5.2 GraphQL — The API Language

**What it is:** GraphQL is a way to ask a server for exactly the data you need — no more, no less. Traditional APIs (called REST) give you a fixed set of data per request. GraphQL lets the client say "I only want the project name and status" and the server returns just that.

**Why we use it:**
- **Efficient data fetching.** The frontend never over-fetches or under-fetches. For example, on the Kanban board we only ask for `id, title, currentStatus, assignedTo` — we do not waste bandwidth fetching descriptions or dates we do not need on that page.
- **Self-documenting.** GraphQL has a built-in schema that describes every query, mutation, and data type. Developers can explore the API without needing a separate manual.
- **Single endpoint.** Everything goes to `/graphql`. There is no need to manage dozens of REST routes.
- **Strong typing.** Every field in the schema has a defined type, which catches mistakes early.

**Trade-offs:**
- Slightly more complex to set up than REST.
- Query depth and complexity must be limited to prevent abusive queries that could overload the server. We limit depth to 7; a complexity limit is planned (`graphql-query-complexity` is installed but not wired in).
- File uploads require special handling (not yet needed in this project).

---

### 5.3 Apollo Server — The GraphQL Engine

**What it is:** Apollo Server is the library that runs our GraphQL API. It handles receiving requests, parsing the GraphQL query, running our code, and sending the result back.

**Why we use it:**
- The most widely used and well-supported GraphQL server for Node.js.
- Built-in support for subscriptions (real-time features), plugins (for metrics), and context injection (for authentication).
- Version 5 (what we use) is built to be lightweight and framework-agnostic.

---

### 5.4 MongoDB — The Database

**What it is:** MongoDB is a database that stores data as documents (similar to JSON objects) rather than rows in a spreadsheet. It is called a NoSQL database.

**Why we use it:**
- **Flexible schema.** Our data models can evolve without requiring database migrations that change existing rows.
- **Natural fit for JavaScript.** MongoDB documents are essentially JavaScript objects. There is no awkward translation layer between the code and the database.
- **Mongoose** (the library we use on top of MongoDB) provides a clean model definition, validation, and query interface.
- Scales well horizontally (can distribute data across many servers).

**Trade-offs:**
- Does not enforce strict relationships between data like a relational database (e.g., PostgreSQL). We manage relationships manually in the application code.
- Transactions across multiple documents require extra care. We handle this with explicit rollback logic where needed (e.g., if creating a user's preference fails, we delete the user).

---

### 5.5 Redis — The Cache and Message Bus

**What it is:** Redis is an extremely fast in-memory data store. We use it for two purposes:

1. **Caching:** Storing frequently read data (like the list of all users or a client's details) so the database is not queried on every request.
2. **PubSub (Publish / Subscribe):** A messaging system that lets the server push notifications to the right user in real time.

**Why we use it:**
- **Speed.** Redis reads and writes data in microseconds because it lives entirely in memory, whereas a database read involves disk access.
- **Real-time support.** Redis PubSub is what powers our live notifications — when a task is assigned to you, you see the notification instantly without refreshing.
- Industry standard — battle-tested, simple API, excellent client library support.

**Trade-offs:**
- Data in memory is lost if Redis restarts unless persistence is configured. For a cache this is acceptable (we re-populate from the database). Redis saves snapshots to a Docker volume, so cached keys that haven't expired survive a restart.
- Adds operational complexity — another service to run and monitor.

---

### 5.6 BullMQ — The Job Queue

**What it is:** BullMQ is a library that lets you queue background jobs — tasks that should run asynchronously, after the request has already returned a response to the user.

> **Status:** the queue and worker are built but not wired in yet. Services currently save notifications directly and publish them over Redis PubSub.

**Why we use it:**
- Creating and delivering notifications happens in the background. The API responds immediately and the notification delivery happens separately, so the user never waits for it.
- If the notification worker crashes, BullMQ keeps the job in the queue and retries it automatically.
- Provides a reliable way to offload work from the main API process.

**Trade-offs:**
- Adds another moving part — the worker process must be running separately.
- Debugging failed jobs requires checking the queue.

---

### 5.7 React — The User Interface Framework

**What it is:** React is a JavaScript library for building user interfaces. It breaks the page into small, reusable pieces called components (a button, a form, a navigation bar) that automatically update when data changes.

**Why we use it:**
- The most popular frontend framework in the world — huge community, excellent tooling, and many ready-made component libraries.
- Component-based architecture makes it easy to build and maintain complex UIs.
- React's virtual DOM means only the parts of the page that actually changed are updated, keeping the app fast.

---

### 5.8 TypeScript — Type Safety on the Frontend

**What it is:** TypeScript is JavaScript with types. Instead of allowing any variable to hold any kind of value, TypeScript requires you to declare what type a variable is.

**Why we use it:**
- Catches bugs at write time, not at runtime. If a function expects a `User` object and you accidentally pass a `string`, TypeScript tells you immediately.
- Makes large codebases much easier to navigate — you can always see what shape of data a function expects.
- The frontend is entirely TypeScript.

---

### 5.9 Redux — Global State Management

**What it is:** Redux is a library for managing state (data) that is shared across many parts of the application. Without Redux, passing data between unrelated components in React becomes messy.

**Why we use it:**
- The logged-in user's token and profile need to be available everywhere — in the sidebar, the header, every page. Redux keeps this in one place.
- All entity lists (users, clients, projects, tasks, sub-tasks) are cached in Redux so we do not re-fetch from the server unnecessarily.
- The LOGOUT action resets every slice of state simultaneously — a clean, reliable way to wipe the session.

**Trade-offs:**
- More boilerplate code than simpler alternatives. We mitigate this by following a consistent pattern across all reducers.

---

### 5.10 Docker — Containerisation

**What it is:** Docker packages an application and all its dependencies into a self-contained unit called a container, so it runs identically on any machine.

**Why we use it:**
- "Works on my machine" is eliminated. The container runs the same in development, on CI, and in production.
- We have separate profiles: `dev` (with hot-reload and observability tools) and `prod` (optimised multi-stage build).
- The notification worker has its own container definition, isolated from the main API (commented out until the queue is wired in).
- The `dev` profile includes Prometheus and Grafana, with alert rules and a dashboard set up automatically.

---

## 6. How Data Flows Through the System

Here is what happens from the moment you click a button in the browser to when you see the result:

```
You click "Create Task" in the browser
        │
        ▼
React collects the form data and sends a GraphQL mutation to the server
(POST http://localhost:8000/graphql, with your JWT token in the header)
        │
        ▼
Apollo Server receives the request
  ├─ Checks your JWT token — are you logged in? Is it expired?
  ├─ Checks query depth — is this request trying to nest 20 levels deep? (blocked)
  └─ Adds your user identity to a "context" object passed to the next layer
        │
        ▼
GraphQL Resolver (thin layer)
  └─ Calls the appropriate Service method, passing the inputs and context
        │
        ▼
Service Layer (all the real logic happens here)
  ├─ Validates inputs with Zod schemas (correct types? required fields present?)
  ├─ Checks your role — are you allowed to create tasks? (USER role cannot)
  ├─ Checks Redis cache — is this data already cached?
  │     ├─ Cache hit → return cached data immediately
  │     └─ Cache miss → continue to Repository
  ├─ Calls the Repository to write to MongoDB
  ├─ Invalidates any stale cache entries
  ├─ Calls NotificationService to notify the assigned user
  │     └─ NotificationService → saves notification → publishes to Redis PubSub
  │           └─ GraphQL Subscription → delivers to that user's browser instantly
  └─ Writes an audit log entry (who did what and when)
        │
        ▼
Repository (pure database access)
  └─ Runs the Mongoose query, returns a plain JavaScript object
        │
        ▼
Apollo Server formats the result and sends it back to the browser
        │
        ▼
React receives the response
  ├─ Updates the Redux store (new task added to the list)
  └─ Re-renders the relevant parts of the page automatically
```

The assigned user, meanwhile, sees a notification bell update — without refreshing. That is the Redis PubSub path running in parallel.

---

## 7. Security — How We Keep Things Safe

Security is not an afterthought — it is baked into every layer.

| Layer | Protection |
|---|---|
| **HTTPS** | All traffic should be served over HTTPS in production (handled at the load balancer / reverse proxy layer) |
| **JWT Tokens** | Every request (except login, register, forgot and reset password) must include a valid, non-expired signed token; otherwise the API returns 401 |
| **Safe Sign-up** | Public registration always creates a regular `USER`; admin roles can only be granted by a Super Admin |
| **No Account Probing** | Login gives the same error for an unknown email and a wrong password, and forgot-password gives the same reply whether or not the account exists |
| **Token Expiry** | Tokens expire after 1 hour — a stolen token becomes useless quickly |
| **Password Hashing** | Passwords are never stored in plain text. We use bcrypt with 10 rounds of hashing |
| **Login Lockout** | After 5 failed login attempts, the account is locked for 1 hour to stop brute-force attacks |
| **Password Reset** | The reset link is emailed (never shown in the API response); tokens are stored hashed, expire after 1 hour and are one-time use |
| **Role-Based Access Control** | Every service method checks the caller's role. The check happens on the server — it cannot be bypassed by manipulating the frontend |
| **Input Validation** | Every input is validated by Zod schemas before touching the database. Invalid data is rejected with a clear error |
| **MongoDB ID Validation** | Every ID parameter is checked against the MongoDB ObjectId format before any database call |
| **Query Depth Limit** | GraphQL queries cannot be nested more than 7 levels deep, preventing certain DoS attacks |
| **Rate Limiting** | In development the app limits requests per IP; in production this is handled by the AWS infrastructure |
| **Secrets** | Environment files are git-ignored, and logs mask passwords, tokens and auth headers |
| **CORS** | Cross-Origin Resource Sharing is configured to only allow requests from trusted origins |
| **Introspection Disabled** | In production, the GraphQL schema cannot be explored — attackers cannot easily discover the API surface |

---

## 8. Notifications — Staying in the Loop

When something important happens — a task is assigned to you, your task is resolved, a project adds you — you are notified automatically.

**How it works:**

1. A service method (e.g., `createTask`) calls `NotificationService.notify(userId, message)`.
2. A notification record is saved to MongoDB with `status: UNREAD`.
3. The notification is published to a Redis PubSub channel specific to that user: `NOTIFICATION_CREATED:{userId}`.
4. If the user's browser is connected via a GraphQL Subscription (WebSocket), the notification is delivered **instantly**.
5. If the browser is not connected via WebSocket, the frontend polls every 30 seconds and picks up the notification on the next poll.

**Notification Events:**

| What Happened | Who Gets Notified |
|---|---|
| You were promoted to Client Admin | You |
| You were assigned as admin for a client | You |
| You were added to a project | You |
| A task was created and assigned to you | You |
| A task was reassigned to you | You |
| A task you are on was resolved | Creator and assignee |
| A task you created was reopened | You (the creator) |
| A task assigned to you was deleted | You |
| A sub-task was assigned to you | You |
| A sub-task you are on was resolved | Creator and assignee |
| A sub-task you created was reopened | You |
| A sub-task assigned to you was deleted | You |

---

## 9. Observability — Knowing What Is Happening

A production system needs to be observable — you need to know it is healthy, how fast it is, and what went wrong when things break.

**Logging (Pino):**
- Every request generates a structured log entry (in JSON in production, in pretty colour in development).
- Each log entry includes a unique request ID, the operation name, the user's IP, the user ID once logged in, and how long it took.
- Sensitive operations (create, update, delete) and auth events (logins, failed logins, password resets) write **audit logs** with `{ audit: true, userId, action }` so there is always a record of who did what.
- Passwords, tokens and auth headers are masked in logs.

**Metrics (Prometheus + Grafana):**
- A separate HTTP server on port 9090 exposes metrics in Prometheus format.
- We track: `graphql_requests_total` (requests per operation, including rejected logins/tokens), `graphql_request_duration_ms` (how long each operation took) and `cache_operations_total` (cache hits and misses).
- In production cluster mode, the numbers are combined across all worker processes.
- Grafana shows a ready-made "ProjoMan API" dashboard, and Prometheus alerts fire if the API is down, errors exceed 5%, or responses get slow.

**Health:**
- `/health/live` and `/health/ready` let a load balancer check the server. Ready only fails if MongoDB is unreachable, because the app still works without Redis.
- Crashes from uncaught errors are logged before the process exits.
- The Redis client has a retry strategy with exponential backoff — if Redis is temporarily unavailable, the app retries and logs a warning rather than crashing.
- Environment variables are validated at startup — if a required variable is missing, the server refuses to start with a clear error rather than crashing unexpectedly later.

---

## 10. What Is Still Being Built

The system is functionally complete and production-ready for its core use case. The following features are planned:

| Feature | Status | Notes |
|---|---|---|
| **Comment System** | In progress | The database model is built. The service, resolver, and frontend UI are next |
| **Notification Queue** | In progress | BullMQ queue and worker exist; services don't use them yet |
| **CI/CD Pipeline** | Planned | GitHub Actions for automated testing and Docker deployment |
| **AWS Deployment** | Planned | Architecture designed (see `docs/AWS_ARCHITECTURE.md`) |
| **E2E Tests** | Planned | Full integration tests with Playwright for the frontend |
| **Real-time Task Updates** | Planned | Replace 30-second polling with GraphQL Subscriptions (infrastructure already exists) |
| **Mobile Improvements** | Planned | Better responsive layouts for small screens |

---

*This document covers the system at a high level. For detailed API documentation, see `docs/BACKEND.md`. For frontend implementation details, see `docs/FRONTEND.md`.*
