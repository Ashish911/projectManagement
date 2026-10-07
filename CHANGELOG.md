# Changelog

All notable changes to ProjoMan. Newest first.

## Unreleased — since `9906d68` (2026-10-06)

### Upgrade notes

Read these before deploying or pointing an existing client at this version.

**Breaking API changes**

| Change | Before | After | What to do |
|---|---|---|---|
| GraphQL enum names | Lower-case names (`normal`, `in_progress`) mapped to upper-case values | Names equal values: `NORMAL`, `IN_PROGRESS`, `URGENT`, … (`Gender` on `register` still takes `M` / `F` / `O`) | Send upper-case enum literals |
| Date fields | `Task.deadline`, `SubTask.deadline` and `Notification.createdAt` serialized as epoch-millisecond strings; `deadline` was non-null | ISO 8601 strings; `deadline` is nullable | Parse with `new Date(iso)`; handle `null` deadlines |
| `notifications` with none | `NOT_FOUND` error | `[]` | Drop the "not found means empty" handling |
| `markAllAsRead` with nothing unread | `NOT_FOUND` error | Succeeds and returns the list | Remove the error handling for this case |
| `Client.email`, `Client.phone` | Declared non-null (but could be missing, which errored) | Nullable | Handle `null` |
| WebSocket auth | Token checked per subscription | Checked once on connect; a missing or invalid token closes with **4403** | Send `connectionParams.authorization: "Bearer <token>"`; don't retry on 4403 |

**Documentation corrections** (the code was already this way): delete-style mutations return the deleted entity, not `MessageType`; `assignAdmin` takes `id, assignedAdmin`; `addUserToProject` / `removeUserFromProject` take `id, users`. Clients written against the old docs should check these.

**Operations**
- **Sync database indexes once per deploy:** `npm run db:indexes:prod -- --dry-run` to review, then `npm run db:indexes:prod`. Production no longer builds indexes at startup (`autoIndex` is off). The first run rebuilds the old `*_idx` indexes under schema names. Expect a moment without the `users.email` unique constraint while it is rebuilt, so run it in a quiet window.
- **Deploy the notification worker:** `node worker/notification.worker.js`, or the `worker` / `worker-prod` compose services. Without it, notifications queue up in Redis and aren't delivered. (The API saves them directly only when Redis is unreachable.)
- **Redis must keep `maxmemory-policy noeviction`** (BullMQ requirement).
- **Set `APP_URL`** in every environment: invite emails link to it, as reset emails already did. A verified `EMAIL_FROM` is needed for real delivery.
- **Frontend containers:** rebuild with `docker compose --profile dev up -d --build --renew-anon-volumes frontend` (new dependencies: `graphql-ws`, `@dnd-kit/core`, Vitest tooling).

**Known issues surfaced during this work** (most predate it): see S-1 to S-9 in `server/STATUS.md` and F-1 to F-10 in `frontend/STATUS.md`. Two are rated High (S-1, S-2: client-admin access control) and should be fixed before production.

### Server

**Comments**
- Comments on tasks and sub-tasks: `taskComments`, `subTaskComments`, `addTaskComment`, `addSubTaskComment`, `updateComment`, `deleteComment` (`services/comment.service.js`, `repositories/comment.repo.js`, `graphql/types/comment.type.js`).
- Only project members may comment: assigned users, the client's `CLIENT_ADMIN`, or any `SUPER_ADMIN`. The author edits; the author or an admin deletes.
- The task's assignee and creator are notified of new comments (not the author).
- Deleting a task or sub-task deletes its comments.

**User administration** (`SUPER_ADMIN`)
- `createUser`: invite by email (48-hour link) or set a temporary password.
- `updateUser`, `changeUserRoles` (bulk; at least one super admin must remain), `unlockUsers`, `resendInvite`, `deleteUsers` (bulk).
- `changePassword` for any signed-in user (current password required).
- New user fields:
  - `status`, derived as `ACTIVE` / `LOCKED` / `INVITED`;
  - `lastLoginAt`, set on login;
  - `invitedAt`, cleared when the invite is accepted.
- Deleting a user detaches them from tasks, sub-tasks, projects and any client they administer.
- Invite email via Bird: `EmailService.sendInvite` in `services/email.service.js`, alongside the password-reset email.

**Clients**
- `declineClientDeletion(id, message)`: the super admin rejects a deletion request and the client admin is notified with the message.
- Client email and phone are optional.

**Tasks and projects**
- `allTasks`: every task the caller can see, role-scoped (all / their client's projects / assigned projects).
- New task fields:
  - `createdAt`;
  - `resolvedAt`, set when resolved and cleared when reopened;
  - `subTaskStats { done, total }`;
  - `deadline` as an ISO string, nullable.
- `createTask` accepts `currentStatus` (`NEW` / `IN_PROGRESS`).
- Deadline and assignee can be cleared with `null` on tasks and sub-tasks.
- Projects have a `dueDate`.

**Notifications**
- `notify()` now adds a job to the BullMQ `notifications` queue (3 attempts, exponential back-off).
  - The worker (`worker/notification.worker.js`) calls `deliver()`, which saves to MongoDB and publishes to the user's `notificationCreated` subscription.
  - If the queue can't be reached within 3 s (Redis down), `notify()` delivers directly so nothing is lost.
- `markNotificationsRead(ids)` is new. `markAllAsRead` and `markNotificationsRead` are each one `updateMany`, scoped to the caller.
- `notifications` is newest first and returns `[]` instead of an error when empty. `createdAt` is an ISO string.
- WebSocket connections are authenticated once on connect; a missing or invalid token closes the socket with code 4403.
- New notification triggers: added to a project, comment added, role changed, client deletion declined.

**API and platform**
- GraphQL enum names now equal their values (`"IN_PROGRESS"`, `"URGENT"`, …). `Gender` keeps `M` / `F` / `O`.
- The HTTP context builder is extracted as `buildHttpContext`:
  - request ID and per-request logger;
  - operation-name sanitising (it is a metric label);
  - unauthenticated requests are counted;
  - public operations also get a context.
- Health probes `/health/live` and `/health/ready` (`config/health.js`; 503 only when MongoDB is down).
- Cluster mode: one worker per CPU outside dev, re-forked on exit. The primary serves metrics aggregated from all workers.
- Metrics:
  - `cache_operations_total` (hit / miss / error);
  - `graphql_requests_total` with `status` success / error / unauthenticated.
- Logs:
  - audit logs for auth events (LOGIN, LOGIN_FAILED, REGISTER, PASSWORD_RESET*);
  - secret fields redacted.
- Fatal crash logging for unhandled rejections and uncaught exceptions.
- Docker:
  - `worker` (dev) and `worker-prod` (prod) notification-worker services;
  - Prometheus alert rules (`prometheus/alerts.yml`) and the provisioned Grafana "ProjoMan API" dashboard.

**Fixes**
- **Indexes:** they were defined twice (schemas and a `createIndexes()` helper in `config/logger.js`) with conflicting names and options.
  - Effects: Mongoose's builds failed silently; `clients` had two email indexes; `tasks`, `subtasks` and `notifications` had none, so `Task.subTaskStats` ran two full scans per task.
  - Now each index is declared once, in its schema (`createIndexes()` removed), and `scripts/sync-indexes.js` is new.
- **Second client without an email failed:** the unique email index wasn't partial, so a second client with no email hit a duplicate-key (E11000) error. The index is now partial (`email > ""`).
- **`ClientType.email` / `phone` were non-null in GraphQL:** creating a client without an email saved it, but the response failed with "Cannot return null for non-nullable field". Both are now nullable.
- `markAllAsRead` and `deleteAllNotifications` never touched any rows: they used `n._id`, which the repository strips.
- `addClient` ignored `assignedAdmin`.
- `deleteClientRequest` never set the `deleteRequest` flag and had no ownership check.
- Enum name/value mismatch broke task priority and status, and project status updates, from the app.
- Two test suites read the real Redis cache, which caused 3 flaky failures.
- An unused `notificationQueue` import in `client.service.js` was removed.

**Tests**
- New suites: `comment.test.js`, `userAdmin.test.js` and `server.test.js` (`buildHttpContext`).
- Notification tests cover the queue, the fallback (failure and hang), the worker job and bulk reads.
- New suites: `indexes.test.js` and `graphqlTypes.test.js`.
- 386 tests in 12 suites. New behaviour is written test first.

### Frontend

**Redesign** (from `ProjoMan Dashboard (standalone) (1).html`)
- Tailwind with OKLCH design tokens and dark mode, Geist fonts, and `motion` for sliding pills and page transitions.
- Design-system pieces in `src/components/pm/`: PageHead, Panel, StatCard, StatusBadge, Avatar, Progress, TaskRow, ProjectCard, Segmented, AnimatedTabs, CountUp, and SVG charts (AreaChart, Donut, Sparkline).
- New shell: collapsible sidebar, top bar with search (⌘K), theme toggle, and a bell with an unread dot.
- Dashboards:
  - Admin (super / client admin) and Member dashboards from real data;
  - 7d / 30d / 90d range switch, remembered per browser.
- Users:
  - role tabs and search;
  - table with selection and a bulk bar (role, unlock, remove);
  - invite / create, edit, CSV / JSON export.
- Clients:
  - table and detail panel;
  - approve or decline deletion requests;
  - assign admin, force delete;
  - client admins see their own client and can request deletion.
- Projects: grid and board, plus a new project detail page (`/projects/:id`) with burn-down, up next, by status and team.
- Tasks: board with drag and drop between statuses (`@dnd-kit/core`) and a list view. The Kanban screen is gone; `/kanban` redirects to `/tasks`.

**Forms system**
- `openForm(kind, data)` host (`components/forms/form-host.tsx`) and `form-kit.tsx`:
  - `useForm` validation on blur;
  - modal with Esc and ⌘↵;
  - a shake when the form is invalid.
- Forms for task, project, team, user, bulk role / unlock / remove, export, client, decline request, account, change password and log update.
- ⌘K command palette.
- Task side sheet: inline edits, status, sub-tasks, and comments (list, add, delete).
- Confirmation dialogs for deleting a client, project or users (`danger-form.tsx`, typed confirmation).
- Deletes are delayed 5 s with an Undo toast.

**Notifications**
- Notifications side sheet with All / Unread tabs.
- Live updates over WebSocket (`graphql-ws`): new notifications appear instantly with an "Open" toast. A 5-minute safety poll and a refresh after reconnecting cover anything missed.
- Clicking a notification marks that one read; "Mark all read" is one request; opening the sheet marks nothing. Updates are optimistic and roll back on error.

**Hooks and API**
- `src/hooks/`: `useAsyncAction`, `useLocalStorage` (with `raw` / `isValid`), `useSelection`, `useOutside`, `useSubscription`, `useNotifications`, and an `index.ts` that re-exports these plus the existing hooks.
- Every `src/api/*.ts` uses one `gql()` helper, replacing 8 duplicated Axios setups. It surfaces GraphQL messages from 401 / 429 replies.
- `src/api/ws.ts`: a lazy WebSocket client that sends the token on connect, reconnects with back-off (not after 4403) and is closed on logout.
- New API functions for user admin, `allTasks`, `getClient`, `declineClientDeletion`, comments and bulk mark-read.

**Fixes**
- Notifications request loop: an inline `useSyncExternalStore` subscribe sent about 125k requests. The store now uses a stable subscribe, guarded by a test.
- ⌘↵ during a save sent the request three times in five forms. `useAsyncAction` now ignores re-entry.
- The `PROFILE` query was missing `id`.
- Chart curves no longer overshoot below zero.

**Tests**
- Vitest and Testing Library (jsdom) set up: `npm test`, `npm run test:run`.
- 82 tests in 15 files: hooks, `gql`, the WebSocket client, the notification store, sheet and header, five forms, Users selection, dashboard range and theme.

### Infrastructure
- Frontend Docker container. After `package.json` changes, rebuild with `--renew-anon-volumes`.
- The notification worker runs as its own container in dev and prod.

### Docs and process
- Test-first rule added to the root `CLAUDE.md` and `frontend/CLAUDE.md`.
- `frontend/CLAUDE.md` rewritten for the current app.
- Updated: README, both `STATUS.md` files, `server/Routes.md`, `frontend/Routes.md`, `frontend/README.md` and everything in `docs/`.
