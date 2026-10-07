# ProjoMan — Frontend Documentation

> A complete guide to the React application: how it is structured, every screen, how state is managed, and how it talks to the backend.

| | |
|---|---|
| **Audience** | Frontend engineers |
| **Last reviewed** | 2026-10-06 |
| **Related** | [../frontend/Routes.md](../frontend/Routes.md) · [../frontend/CLAUDE.md](../frontend/CLAUDE.md) (conventions) · [../frontend/STATUS.md](../frontend/STATUS.md) · [docs index](README.md) |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Project Structure](#2-project-structure)
3. [Getting Started](#3-getting-started)
4. [Technology Choices](#4-technology-choices)
5. [How the Application Starts](#5-how-the-application-starts)
6. [Routing and Access Control](#6-routing-and-access-control)
7. [Pages — What Each Screen Does](#7-pages--what-each-screen-does)
8. [Components — Shared Building Blocks](#8-components--shared-building-blocks)
9. [State Management — Redux](#9-state-management--redux)
10. [API Layer — Talking to the Backend](#10-api-layer--talking-to-the-backend)
11. [GraphQL Queries Reference](#11-graphql-queries-reference)
12. [GraphQL Mutations Reference](#12-graphql-mutations-reference)
13. [TypeScript Types](#13-typescript-types)
14. [Authentication Flow](#14-authentication-flow)
15. [Notification System](#15-notification-system)
16. [Theming and Styling](#16-theming-and-styling)
17. [Reusable Hooks](#17-reusable-hooks)
18. [Testing](#18-testing)

---

## 1. Overview

The ProjoMan frontend is a **single-page application (SPA)** built with React and TypeScript. It talks only to the GraphQL backend:
- **HTTP POST** carries queries and mutations, through one `gql()` helper.
- **WebSocket** (`graphql-ws`) carries live notifications.

When you load the app in a browser:

1. React renders the entire application in your browser — there is no page reload when navigating.
2. JWT authentication is checked on startup from `localStorage`.
3. Role-based routing ensures you only ever see pages your role is allowed to access.
4. Data is fetched from the GraphQL API once and kept in the Redux store. Forms update the store with the server's response, so lists stay current without reloading.
5. Notifications arrive **instantly** over a WebSocket subscription. A 5-minute safety refresh and a reload after reconnecting catch anything missed.

The interface follows the design in `ProjoMan Dashboard (standalone) (1).html` (repo root):
- Tailwind with OKLCH design tokens, light and dark themes.
- Geist fonts, small hand-written SVG charts.
- Forms that open over any page.

---

## 2. Project Structure

```
frontend/src/
│
├── App.tsx                   # Providers + all routes
├── main.tsx                  # Entry point — fonts, global CSS, mounts App
├── index.css                 # Design tokens (OKLCH, light + dark), tone classes, animations
│
├── api/                      # Talking to the backend
│   ├── graphql.ts            # gql<T>(query, variables) — the one Axios instance (Bearer token)
│   ├── ws.ts                 # graphql-ws client: subscribe(), onReconnect(), closeSocket()
│   ├── authApi.ts  userApi.ts  clientApi.ts  projectApi.ts
│   ├── taskApi.ts  subTaskApi.ts  commentApi.ts  notificationApi.ts  preferenceApi.ts
│
├── queries/  mutations/      # Raw GraphQL strings (incl. the notification subscription)
├── types/                    # TypeScript interfaces for API payloads
├── hooks/                    # Reusable hooks (see §17); index.ts re-exports all of them
│
├── redux/
│   ├── store/store.ts        # Root store — token validation on startup, LOGOUT reset
│   ├── reducers/  actions/  constants/
│
├── components/
│   ├── ui/                   # shadcn/ui primitives (Button restyled to the design)
│   ├── pm/                   # Design-system building blocks + charts/ (see §8)
│   ├── forms/                # Form system: form-kit, form host, every form and sheet, toaster
│   ├── hooks/                # useTheme, useIsMobile, legacy useInputFields/useInputMap
│   └── lib/utils.ts          # cn()
│
├── Screens/
│   ├── Auth/                 # Login, Register, ForgotPassword, ResetPassword
│   ├── Dashboard/            # Dashboard (+ dashboard/: AdminDashboard, MemberDashboard, widgets),
│   │                         #   Users, Clients, Projects, ProjectDetail, Tasks, Analytics, Account
│   ├── Components/           # AppLayout, app-sidebar, site-header, nav-*, profile-*, AnalyticsDashboard
│   ├── ui-Components/        # Auth form components
│   └── RouteHandler/         # ProtectedRoute and PublicRoute
│
└── test/setup.ts             # Vitest setup (jest-dom, observer stubs, cleanup)
```

Tests sit next to the code they test, as `*.test.ts(x)`.

---

## 3. Getting Started

```bash
cd frontend
npm install
npm run dev        # http://localhost:4000
npm test           # Vitest (watch); npm run test:run for a single run
npm run build      # tsc + production build
npm run preview    # serve the production build
```

**Prerequisites:** Node.js 20+, and the backend API on `http://localhost:8000`. The API's notification worker must be running for live notifications.

**Environment:**

| Variable | Description |
|---|---|
| `VITE_API_URL` | GraphQL endpoint, e.g. `http://localhost:8000/graphql` |
| `VITE_WS_URL` | Optional WebSocket endpoint; defaults to `VITE_API_URL` with `http` → `ws` |

**Docker:** `docker compose --profile dev up -d frontend` (from `frontend/`). The container keeps `node_modules` in an anonymous volume, so after changing `package.json` run `docker compose --profile dev up -d --build --renew-anon-volumes frontend`.

---

## 4. Technology Choices

### React 18

React is the foundation of the UI. It splits the page into small, reusable pieces called **components**. When data changes, React automatically updates only the parts of the page that need to change — the rest stays the same. This makes the app fast and smooth.

### TypeScript

Every file in the frontend is TypeScript. TypeScript adds type definitions to JavaScript — it tells the editor and build tool what shape each piece of data has. If a component expects a `User` object with a `name` string and you accidentally pass a number, TypeScript catches the mistake before you even run the code.

### React Router 6

Handles navigation between pages. In a React SPA, the URL changes without the browser actually loading a new page — React Router intercepts the URL and renders the right component for that path.

### Redux Toolkit

Manages application-wide state — data that multiple unrelated components need to share. The logged-in user's token, profile, and all entity lists (users, clients, projects, tasks, sub-tasks) live in Redux.

**Why not just React state (useState)?**

React state is per-component. If the sidebar needs to know the user's role and the main content area also needs it, you would have to pass it through many layers of components ("prop drilling"). Redux puts everything in a single place that any component can access directly.

### React Query

Used only on the auth screens (`useMutation` for login, register, forgot and reset password). Signed-in screens use Redux thunks and the `useAsyncAction` hook.

### Axios

The HTTP client behind `gql()` (`src/api/graphql.ts`). There is exactly one Axios instance. Its **interceptor** (a function that runs on every request) attaches the JWT from `localStorage` to the `Authorization` header.

### Tailwind CSS

A utility-first CSS framework. Instead of writing custom CSS classes, you apply small utility classes directly in the HTML/JSX:

```tsx
<div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
```

Colours come from design tokens (`bg-card`, `text-muted-foreground`, `border-strong`…), never raw palette classes, so every screen supports both themes. See §16. Dark mode is supported via Tailwind's `class` strategy — adding or removing a `dark` class on the root element switches the entire theme.

### shadcn/ui + Radix UI

Pre-built, accessible, unstyled UI components (buttons, dialogs, dropdowns, sheets, popovers). These handle the hard parts of UI — keyboard navigation, screen reader support, focus management — so the team can focus on the application logic.

### motion

`motion/react` animates the sliding tab and nav "pills" (shared `layoutId`) and the page transition. Everything else uses CSS keyframes defined in `tailwind.config.js`.

### @dnd-kit/core

Powers drag and drop on the Tasks board. Cards are draggable; status columns are drop targets.

### graphql-ws

The WebSocket client for GraphQL subscriptions (same protocol as the server). See §10 and §15.

### Vitest + Testing Library

Unit and component tests run in jsdom. See §18.

---

## 5. How the Application Starts

When the browser loads the app, this sequence happens:

1. **`main.tsx`** loads the Geist fonts and `index.css`, then mounts `<App />` in `React.StrictMode`. Before React starts, an inline script in `index.html` applies the cached dark theme (`localStorage['pm-theme']`), so there is no flash.
2. **`App.tsx`** sets up three wrappers (providers) around the entire app:
   - `QueryClientProvider` (React Query) — enables server state management.
   - `Redux Provider` — makes the Redux store accessible to all components.
   - `BrowserRouter` (React Router) — enables URL-based routing.
3. **Redux store initialises** (`store.ts`):
   - Reads the JWT token from `localStorage`.
   - Decodes the token's expiry timestamp.
   - If the token is expired, removes it from `localStorage` and starts with no token.
   - If valid, pre-loads the token into the `login` slice so the user appears logged in.
4. **React Router renders** the component for the current URL.
5. **ProtectedRoute and PublicRoute** check the token and role — redirecting if necessary.
6. Signed-in pages render inside **`AppLayout`**, which wraps them in `FormsProvider` (forms, ⌘K, toasts) and `SidebarProvider`. The sidebar loads the profile and preference. `useAppData()` then loads projects and all tasks, plus users (admins) and clients (super admin), once per session.

---

## 6. Routing and Access Control

All routes are defined in `App.tsx`; the guards are in `Screens/RouteHandler/RouteNavigator.tsx`. Signed-in routes are children of one `ProtectedRoute` → `AppLayout` route, so screens render only their content. `frontend/Routes.md` has the per-route detail.

### Route Table

| Path | Page | Guard | Allowed Roles |
|---|---|---|---|
| `/` | Login | PublicRoute | Unauthenticated only |
| `/register` | Register | PublicRoute | Unauthenticated only |
| `/forgot-password` | Forgot Password | PublicRoute | Unauthenticated only |
| `/reset-password` | Reset Password | PublicRoute | Unauthenticated only |
| `/dashboard` | Dashboard | ProtectedRoute | All authenticated |
| `/account` | Account (Profile) | ProtectedRoute | All authenticated |
| `/users` | Users | ProtectedRoute | `SUPER_ADMIN` only |
| `/clients` | Clients | ProtectedRoute | `SUPER_ADMIN`, `CLIENT_ADMIN` |
| `/projects` | Projects | ProtectedRoute | All authenticated |
| `/projects/:id` | Project detail | ProtectedRoute | All authenticated |
| `/tasks` | Tasks (board + list) | ProtectedRoute | All authenticated |
| `/kanban` | Redirects to `/tasks` | — | — |
| `/analytics` | Analytics | ProtectedRoute | `SUPER_ADMIN`, `CLIENT_ADMIN` |

### How ProtectedRoute Works

```
ProtectedRoute(roles?: string[])
  │
  ├─ No token in Redux? → Redirect to "/" (login page)
  │
  ├─ Roles provided and user's role not in list? → Redirect to "/dashboard"
  │
  └─ All checks pass → Render the page component
```

### How PublicRoute Works

```
PublicRoute
  │
  ├─ Token exists in Redux? → Redirect to "/dashboard"
  │
  └─ No token → Render the page (login/register/etc.)
```

This prevents logged-in users from seeing the login page and prevents unauthenticated users from accessing any protected page.

---

## 7. Pages — What Each Screen Does

Forms and sheets are not separate pages. A screen opens them over itself with `openForm(kind, data)` (see §8, Forms).

### Login, Register, Forgot / Reset Password

The auth screens (not yet restyled to the new design):
- **Login:** email and password.
- **Register:** name, email, phone, date of birth, gender, password.
- **Forgot password:** emails a reset link and always shows the same "check your email" message.
- **Reset password:** reads `?token=` from the link and sets a new password. Invite links open the same page.

### Dashboard (`/dashboard`)

`Dashboard.tsx` waits for the profile, then shows the dashboard for the role.

**AdminDashboard** (super admin and client admin):
- **Quick actions:**
  - Super admin: Invite user and New project.
  - Client admin: New task and New project.
- **"Needs a decision" strip** (super admin only, hidden when empty):
  - Client deletion requests, with Approve and Decline.
  - Clients without an admin, with Assign admin.
- **Stat cards:** users / clients / active projects / overdue tasks / resolved / team members, depending on role; each opens the filtered page.
- **Range switch:** 7d / 30d / 90d. It drives the "Tasks created vs resolved" chart and the resolved count, and is remembered per browser (`useLocalStorage`).
- **Panels:**
  - Project status donut (super admin) or project progress list (client admin).
  - Upcoming deadlines, workload (open tasks by assignee) and activity.

**MemberDashboard** (`USER`):
- "Needs attention" tabs (Overdue / Today / This week) of your own tasks, with one-click resolve.
- Your projects with progress.
- Mini stats, "My week" (tasks due per day), and activity.

All numbers come from real data: `allTasks` returns `createdAt` / `resolvedAt` for the charts.

### Users (`/users`, SUPER_ADMIN)

- Role tabs and search.
- Table showing role, client, projects, open tasks, last seen and status (Active / Locked / Invited).
- Row checkboxes open a bulk bar: change role, unlock, remove. You can't select yourself, and switching tabs clears the selection.
- **Invite person:** send an email invite, or set a temporary password. Choose a role; client admins also pick a client.
- **Edit:** a person's details, plus resend the invite.
- **Export:** CSV or JSON with chosen columns and a live preview.

### Clients (`/clients`, SUPER_ADMIN and CLIENT_ADMIN)

- **Super admin:**
  - Tabs: All / Needs attention / Delete requested.
  - Table and detail panel with projects, progress and admin.
  - Actions: create, edit, assign admin, approve deletion, decline deletion (with a message to the client admin), force delete (typed confirmation).
- **Client admin:** sees their own client, can edit it and can "Request deletion".

### Projects (`/projects`) and Project detail (`/projects/:id`)

- **Projects:** a grid of project cards (progress, team avatars, due date), with status tabs and search. Create and edit open the project form, which shows a live card preview.
- **Project detail:**
  - Header with status and due date.
  - Progress and a burn-down chart, built from task `createdAt` / `resolvedAt`.
  - Open / overdue / resolved counts, "Up next", tasks by status, and team management.

### Tasks (`/tasks`)

- **Board:** four status columns. Drag a card to change its status: admins can move any task, a `USER` only their own.
- **List:** grouped by due date, with rows that expand to show sub-tasks.
- **Filters:** admins can switch between All and Mine; a `USER` sees only their own tasks.
- **Task sheet** (opened by clicking a task):
  - Inline edit of title, priority, assignee and deadline; status buttons.
  - Sub-tasks, with quick add (`!high @name ^fri` sets priority, assignee and due date).
  - Comments.
  - Changes save as you go.
- Creating tasks is for admins only.

### Analytics (`/analytics`, SUPER_ADMIN and CLIENT_ADMIN)

`AnalyticsDashboard`:
- Stat cards; project-status and user-role donuts; client health; largest teams.
- Clicking through opens the filtered page.
- Not yet restyled.

### Account (`/account`)

- Profile (view and edit) and Preferences (theme, language). Not yet restyled.
- The account menu (avatar in the sidebar) also lets you edit your profile, change your password and sign out.

---

## 8. Components — Shared Building Blocks

### Layout (`Screens/Components/`)

| Component | What it does |
|---|---|
| `AppLayout` | Signed-in shell: `FormsProvider` → `SidebarProvider` → sidebar + `SiteHeader` + `PageTransition` around the route's content |
| `app-sidebar` | Logo, role-based nav with a sliding pill (`NAV_BY_ROLE`), collapses to a 64 px icon rail; loads profile + preference |
| `site-header` | Sidebar toggle, title / breadcrumb (`Projects › name` on detail pages), search field that opens ⌘K, theme toggle, bell with unread dot; shows a toast for each live notification |
| `nav-user` | Avatar + name at the bottom of the sidebar; opens the account menu |

**Navigation per role:**

| Role | Links Shown |
|---|---|
| `SUPER_ADMIN` | Dashboard, Users, Clients, Projects, Tasks |
| `CLIENT_ADMIN` | Dashboard, Clients, Projects, Tasks, Analytics |
| `USER` | Dashboard, Projects, Tasks |

### Design system (`components/pm/`)

| Component | Use |
|---|---|
| `PageHead` | Eyebrow, title, subtitle and actions at the top of a screen |
| `Panel` | Card with title, subtitle and actions; staggered entrance |
| `StatCard` | Figure with label, delta and sparkline |
| `StatusBadge` / `Tag` | Status, priority and role pills (the only way to render them) |
| `Avatar` / `AvatarGroup` | Initials avatars with a stable colour per person |
| `Progress`, `CountUp`, `Check`, `EmptyState`, `SearchBox`, `Segmented`, `AnimatedTabs` | Small controls |
| `TaskRow` | One task line (status toggle, title, sub-task chip, assignee, due) + `isOverdue`, `dueBucket` |
| `ProjectCard` | Project card + `projectProgress(tasks, projectId)` |
| `table.tsx` | Shared table class names and `TableCard` |
| `charts/` | `AreaChart`, `Donut`, `Sparkline` and `smoothPath()` (control points clamped so curves never overshoot) |

### Forms (`components/forms/`)

| File | Contents |
|---|---|
| `forms-context.ts` | `FormKind` list, `useForms()` → `openForm(kind, data)`, `FormProps` |
| `form-host.tsx` | `FormsProvider`: renders the one open form (with exit animation), the toaster, and ⌘K / Ctrl+K → search |
| `form-kit.tsx` | `useForm(init, rules)` (validation on blur — empty fields aren't flagged until submit), `FormModal` (portal, Esc, ⌘↵ submits, shake on invalid), `Field`, `Section`, `Grid2`, `Note`, `FormError`, `FormFoot`, `SubmitButton`, `Switch`, `Pills`, `Chip` |
| `combo.tsx`, `date-picker.tsx` | Searchable single/multi select and a date picker |
| `toaster.tsx` | `toast()`, `toastError()`, `scheduleDelete()` — deletes wait 5 s with **Undo** (sent immediately if the page is closed) |
| `use-app-data.ts` | `useAppData()` — the shared data every form and screen reads |
| `task-actions.ts` | `useTaskActions()` — resolve / reopen with optimistic store update |
| Forms | `task-form`, `project-form` (+ `TeamForm`), `user-form` (+ `RoleCards`), `user-bulk-forms` (role, unlock, export), `client-form` (+ `DeclineRequestForm`), `danger-form` (typed-confirmation deletes), `account-forms` (account menu, change password, log update) |
| Sheets | `task-sheet` (`SideSheet`, `TaskSheet`), `notifications-sheet`, `command-palette` |

### Auth forms

`Screens/ui-Components/user-auth-form.tsx`: `UserAuthLoginForm` and `UserAuthRegisterForm` (React Query `useMutation`, legacy input hooks).

---

## 9. State Management — Redux

The Redux store is the single source of truth for all shared application data.

### Store Setup (`store.ts`)

```
Redux Store
│
├── login         → Auth token and loading state
├── register      → Registration status
├── profile       → The logged-in user's profile data
├── preference    → The logged-in user's theme/language settings
├── usersList     → All users visible to this caller
├── clients       → All clients visible to this caller
├── projects      → All projects visible to this caller
├── tasks         → Tasks for the currently selected project
└── subTasks      → Sub-tasks for the currently selected task
```

**LOGOUT behaviour:** A `LOGOUT` action is dispatched when the user logs out. The root reducer catches this and passes `undefined` as the state to every slice reducer, which causes each one to return its initial state. This wipes the entire store in a single action — no data leaks between sessions.

**Token validation on startup:** The store reads the token from `localStorage`, decodes the JWT payload (without verifying the signature — the server verifies it on every request), checks the `exp` field, and removes it if it has expired.

---

### Login Slice (`authLoginReducer`)

**State:**
```typescript
{
  loading: boolean,
  token: string | null,
  error: string | null
}
```

**Actions:**
| Action | What It Does |
|---|---|
| `LOGIN_REQUEST` | Sets `loading: true`, clears `error` |
| `LOGIN_SUCCESS` | Stores token, sets `loading: false` |
| `LOGIN_FAIL` | Stores error message, clears token |
| `LOGOUT` | Clears everything |

---

### Register Slice (`authRegisterReducer`)

**State:**
```typescript
{
  loading: boolean,
  success: boolean,
  error: string | null
}
```

| Action | What It Does |
|---|---|
| `REGISTER_REQUEST` | Sets `loading: true` |
| `REGISTER_SUCCESS` | Sets `success: true`, `loading: false` |
| `REGISTER_FAIL` | Stores error |
| `REGISTER_RESET` | Clears `success` (used when leaving the register page) |

---

### Profile Slice (`profileReducer`)

**State:**
```typescript
{
  loading: boolean,
  profile: User | null,
  error: string | null
}
```

**Thunk: `fetchProfile()`**
- Calls `getProfile()` API.
- Stores result in `profile`.

---

### Users Slice (`usersListReducer`)

**State:**
```typescript
{
  loading: boolean,
  users: User[],
  error: string | null,
  roleFilter: string | null
}
```

**Thunk: `fetchUsers()`**
- Checks if `users.length > 0` — skips the API call if data already loaded.
- Calls `getUsers()` API.

**Store updaters (no re-fetch needed):**
- `removeUserFromStore(id)` — removes a user after deletion.
- `promoteUserInStore(id)` — updates a user's role to `CLIENT_ADMIN` after promotion.
- `setUsersRoleFilter(role)` — sets the active role filter for the Users page.
- `upsertUsersInStore(users)` — merges created or updated users (used by invite, edit and bulk actions).

---

### Clients Slice (`clientsReducer`)

**State:**
```typescript
{
  loading: boolean,
  clients: Client[],
  error: string | null,
  activeFilter: 'pending' | 'unassigned' | null
}
```

**Thunk: `fetchClients()`** — skips if already loaded.

**Store updaters:**
- `addClientToStore(client)` — adds newly created client.
- `updateClientInStore(client)` — updates an edited client.
- `removeClientFromStore(id)` — removes after deletion.
- `flagClientDeleteRequest(id)` — sets `deleteRequest: true` locally.
- `setClientsFilter(filter)` — sets the active filter.

---

### Projects Slice (`projectsReducer`)

**State:**
```typescript
{
  loading: boolean,
  projects: Project[],
  error: string | null,
  statusFilter: string | null
}
```

**Thunk: `fetchProjects()`** — skips if already loaded.

**Store updaters:**
- `addProjectToStore(project)`
- `updateProjectInStore(project)`
- `removeProjectFromStore(id)`
- `setProjectsStatusFilter(status)`

---

### Tasks Slice (`tasksReducer`)

**State:**
```typescript
{
  loading: boolean,
  loaded: boolean,          // true once the first fetch finished ("no tasks" vs "not loaded")
  tasks: Task[],
  selectedProjectId: string | null,
  error: string | null
}
```

**Thunk: `fetchAllTasks(force?)`** — loads every task the user can see (`allTasks`) once; `force` reloads. `updateTaskInStore` merges fields, so a partial update keeps the rest.

**Store updaters:**
- `addTaskToStore(task)`
- `updateTaskInStore(task)`
- `removeTaskFromStore(id)`

---

### SubTasks Slice (`subTasksReducer`)

**State:**
```typescript
{
  loading: boolean,
  subTasks: SubTask[],
  selectedTaskId: string | null,
  error: string | null
}
```

**Thunk: `fetchSubTasks(taskId)`** — caches per task ID.

**Store updaters:**
- `addSubTaskToStore(subTask)`
- `updateSubTaskInStore(subTask)`
- `removeSubTaskFromStore(id)`

---

### Caching Pattern

All list-fetching thunks check the store before making an API call:

```typescript
export const fetchProjects = () => async (dispatch, getState) => {
  const { projects } = getState().projects;
  if (projects.length > 0) return; // Already loaded — skip the API call

  dispatch({ type: PROJECTS_REQUEST });
  try {
    const data = await getProjects();
    dispatch({ type: PROJECTS_SUCCESS, payload: data });
  } catch (err) {
    dispatch({ type: PROJECTS_FAIL, payload: err.message });
  }
};
```

After a mutation (create, update, delete), the result is applied directly to the store without re-fetching all records. This keeps the UI fast and reduces API calls.

---

## 10. API Layer — Talking to the Backend

### HTTP: `gql()`

Every API module calls one helper, `gql<T>(query, variables)`, in `src/api/graphql.ts`:

```typescript
export async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    // POST { query, variables } with Authorization: Bearer <token>
    // → returns response.data.data
    // → throws Error(first GraphQL error message), also for 401 / 429 replies
}
```

API functions are one-liners on top of it:

```typescript
export const getTasks = async (projectId: string): Promise<Task[]> =>
    (await gql<{ tasks: Task[] }>(GET_TASKS, { projectId })).tasks;
```

Don't create new Axios instances. Callers show `error.message` (forms put it in `FormError` or a toast).

### WebSocket: `ws.ts`

| Export | What it does |
|---|---|
| `wsClient()` | The shared `graphql-ws` client. Lazy (the socket opens with the first subscription); sends `connectionParams.authorization` read at connect time; retries forever with back-off **except** after close code 4403 (bad token) |
| `subscribe(query, onData, variables?)` | Starts a subscription; returns an unsubscribe function |
| `onReconnect(listener)` | Called after the socket reconnects, so stores can refetch what they missed |
| `closeSocket()` | Disposes the client (called by `logout()`) |

### API Functions Reference

| File | Functions |
|---|---|
| `authApi.ts` | `loginUser`, `registerUser`, `forgotPassword`, `resetPassword` |
| `userApi.ts` | `getProfile`, `getUsers`, `updateProfile`, `deleteUser`, `promoteToAdmin`, `createUser`, `updateUser`, `changeUserRoles`, `unlockUsers`, `resendInvite`, `deleteUsers`, `changePassword` |
| `clientApi.ts` | `getClients`, `getClient`, `addClient`, `updateClient`, `confirmDeleteClient`, `deleteClientBySuperAdmin`, `forceDeleteClient`, `assignAdmin`, `declineClientDeletion` |
| `projectApi.ts` | `getProjects`, `addProject`, `updateProject`, `deleteProject`, `addUserToProject`, `removeUserFromProject` |
| `taskApi.ts` | `getTasks`, `getAllTasks`, `createTask`, `updateTask` (`null` clears deadline / assignee), `updateTaskStatus`, `deleteTask` |
| `subTaskApi.ts` | `getSubTasks`, `createSubTask`, `updateSubTask`, `updateSubTaskStatus`, `deleteSubTask` |
| `commentApi.ts` | `getTaskComments`, `addTaskComment`, `deleteComment` |
| `notificationApi.ts` | `getNotifications`, `markAsRead`, `markAllAsRead`, `markNotificationsRead`, `deleteNotification`, `deleteAllNotifications`, `subscribeToNotifications` |
| `preferenceApi.ts` | `getPreference`, `updatePreference` |

`frontend/Routes.md` maps each function to its GraphQL operation name.

---

## 11. GraphQL Queries Reference

The raw GraphQL strings in `src/queries/`, reproduced from the source (including the notification subscription). Copy changes here from the source; the source wins if they differ.

### `queries/clientQueries.ts`

**`GET_CLIENTS`**

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

**`GET_CLIENT`**

```graphql
query GetClient($id: ID!) {
    client(id: $id) {
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

### `queries/notificationQueries.ts`

**`GET_NOTIFICATIONS`**

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

**`NOTIFICATION_CREATED`**

```graphql
subscription OnNotificationCreated {
    notificationCreated {
        id
        content
        status
        createdAt
    }
}
```

### `queries/preferenceQueries.ts`

**`GET_PREFERENCE`**

```graphql
query GetPreference {
  preference {
    id
    theme
    language
  }
}
```

### `queries/projectQueries.ts`

**`GET_PROJECTS`**

```graphql
query GetProjects {
    projects {
        ${PROJECT_FIELDS}
    }
}
```

**`GET_PROJECT`**

```graphql
query GetProject($id: ID!) {
    project(id: $id) {
        ${PROJECT_FIELDS}
    }
}
```

### `queries/subTaskQueries.ts`

**`GET_SUB_TASKS`**

```graphql
query GetSubTasks($taskId: ID!) {
    subTasks(taskId: $taskId) {
        ${SUB_TASK_FIELDS}
    }
}
```

### `queries/taskQueries.ts`

**`GET_TASKS`**

```graphql
query GetTasks($projectId: ID!) {
    tasks(projectId: $projectId) {
        ${TASK_FIELDS}
    }
}
```

**`GET_TASK`**

```graphql
query GetTask($id: ID!) {
    task(id: $id) {
        ${TASK_FIELDS}
    }
}
```

**`GET_ALL_TASKS`**

```graphql
query GetAllTasks {
    allTasks {
        ${TASK_FIELDS}
    }
}
```

### `queries/userQueries.ts`

**`PROFILE`**

```graphql
query GetProfile {
    profile{
        id,
        name,
        email,
        number,
        dob,
        gender,
        role
    }
}
```

**`GET_USERS`**

```graphql
query GetUsers {
    users {
        id
        name
        email
        number
        dob
        gender
        role
        status
        lastLoginAt
    }
}
```

**`GET_USER`**

```graphql
query GetUser($id: ID!) {
    user(id: $id) {
        id
        name
        email
        number
        dob
        gender
        role
        status
        lastLoginAt
    }
}
```

---

## 12. GraphQL Mutations Reference

The raw GraphQL strings in `src/mutations/`, reproduced from the source. GraphQL enum values are sent as-is (`"IN_PROGRESS"`, `"URGENT"`); only `Gender` on register uses `M` / `F` / `O`.

### `mutations/authMutations.ts`

**`LOGIN`**

```graphql
mutation LoginMutation($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
  }
}
```

**`REGISTER`**

```graphql
mutation RegisterMutation(
  $name: String!
  $email: String!
  $number: String!
  $dob: String!
  $password: String!
  $gender: Gender!
) {
  register(
    name: $name
    email: $email
    number: $number
    dob: $dob
    password: $password
    gender: $gender
  ) {
    name
  }
}
```

### `mutations/clientMutations.ts`

**`ADD_CLIENT`**

```graphql
mutation AddClient($name: String!, $email: String, $phone: String, $assignedAdmin: ID) {
    addClient(name: $name, email: $email, phone: $phone, assignedAdmin: $assignedAdmin) {
        ${CLIENT_FIELDS}
    }
}
```

**`UPDATE_CLIENT`**

```graphql
mutation UpdateClient($id: ID!, $name: String!, $email: String, $phone: String, $assignedAdmin: ID) {
    updateClient(id: $id, name: $name, email: $email, phone: $phone, assignedAdmin: $assignedAdmin) {
        ${CLIENT_FIELDS}
    }
}
```

**`CONFIRM_DELETE_CLIENT`**

```graphql
mutation ConfirmDeleteClient($id: ID!) {
    confirmDeleteClient(id: $id) {
        id
    }
}
```

**`DELETE_CLIENT_BY_SUPER_ADMIN`**

```graphql
mutation DeleteClientBySuperAdmin($id: ID!) {
    deleteClientBySuperAdmin(id: $id) {
        id
    }
}
```

**`FORCE_DELETE_CLIENT`**

```graphql
mutation ForceDeleteClient($id: ID!) {
    forceDeleteClient(id: $id) {
        id
    }
}
```

**`ASSIGN_ADMIN`**

```graphql
mutation AssignAdmin($id: ID!, $assignedAdmin: ID!) {
    assignAdmin(id: $id, assignedAdmin: $assignedAdmin) {
        ${CLIENT_FIELDS}
    }
}
```

**`DECLINE_CLIENT_DELETION`**

```graphql
mutation DeclineClientDeletion($id: ID!, $message: String) {
    declineClientDeletion(id: $id, message: $message) {
        ${CLIENT_FIELDS}
    }
}
```

### `mutations/commentMutations.ts`

**`GET_TASK_COMMENTS`**

```graphql
query GetTaskComments($taskId: ID!) {
    taskComments(taskId: $taskId) {
        ${COMMENT_FIELDS}
    }
}
```

**`ADD_TASK_COMMENT`**

```graphql
mutation AddTaskComment($taskId: ID!, $content: String!) {
    addTaskComment(taskId: $taskId, content: $content) {
        ${COMMENT_FIELDS}
    }
}
```

**`DELETE_COMMENT`**

```graphql
mutation DeleteComment($id: ID!) {
    deleteComment(id: $id) {
        id
    }
}
```

### `mutations/notificationMutations.ts`

**`MARK_AS_READ`**

```graphql
mutation MarkAsRead($id: ID!) {
    markAsRead(id: $id) {
        id
        status
    }
}
```

**`MARK_ALL_AS_READ`**

```graphql
mutation MarkAllAsRead {
    markAllAsRead {
        id
        status
    }
}
```

**`DELETE_NOTIFICATION`**

```graphql
mutation DeleteNotification($id: ID!) {
    deleteNotification(id: $id) {
        id
    }
}
```

**`DELETE_ALL_NOTIFICATIONS`**

```graphql
mutation DeleteAllNotifications {
    deleteAllNotifications {
        id
    }
}
```

**`MARK_NOTIFICATIONS_READ`**

```graphql
mutation MarkNotificationsRead($ids: [ID!]!) {
    markNotificationsRead(ids: $ids) {
        id
        status
    }
}
```

### `mutations/preferenceMutations.ts`

**`UPDATE_PREFERENCE`**

```graphql
mutation UpdatePreference($theme: Theme, $language: Language) {
  updatePreference(theme: $theme, language: $language) {
    id
    theme
    language
  }
}
```

### `mutations/projectMutations.ts`

**`ADD_PROJECT`**

```graphql
mutation CreateProject($name: String!, $description: String, $clientId: ID!, $status: ProjectStatus, $dueDate: String) {
    addProject(name: $name, description: $description, clientId: $clientId, status: $status, dueDate: $dueDate) {
        ${PROJECT_FIELDS}
    }
}
```

**`UPDATE_PROJECT`**

```graphql
mutation UpdateProject($id: ID!, $name: String, $description: String, $status: UpdateProjectStatus, $dueDate: String) {
    updateProject(id: $id, name: $name, description: $description, status: $status, dueDate: $dueDate) {
        ${PROJECT_FIELDS}
    }
}
```

**`DELETE_PROJECT`**

```graphql
mutation DeleteProject($id: ID!) {
    deleteProject(id: $id) {
        id
    }
}
```

**`ADD_USER_TO_PROJECT`**

```graphql
mutation AddUserToProject($id: ID!, $users: [ID]!) {
    addUserToProject(id: $id, users: $users) {
        ${PROJECT_FIELDS}
    }
}
```

**`REMOVE_USER_FROM_PROJECT`**

```graphql
mutation RemoveUserFromProject($id: ID!, $users: [ID]!) {
    removeUserFromProject(id: $id, users: $users) {
        ${PROJECT_FIELDS}
    }
}
```

### `mutations/subTaskMutations.ts`

**`CREATE_SUB_TASK`**

```graphql
mutation CreateSubTask($title: String!, $taskId: ID!, $assignedTo: ID, $deadline: String, $priority: SubTaskPriority) {
    createSubTask(title: $title, taskId: $taskId, assignedTo: $assignedTo, deadline: $deadline, priority: $priority) {
        ${SUB_TASK_FIELDS}
    }
}
```

**`UPDATE_SUB_TASK`**

```graphql
mutation UpdateSubTask($id: ID!, $title: String, $assignedTo: ID, $deadline: String, $priority: UpdateSubTaskPriority) {
    updateSubTask(id: $id, title: $title, assignedTo: $assignedTo, deadline: $deadline, priority: $priority) {
        ${SUB_TASK_FIELDS}
    }
}
```

**`UPDATE_SUB_TASK_STATUS`**

```graphql
mutation UpdateSubTaskStatus($id: ID!, $status: SubTaskStatus!) {
    updateSubTaskStatus(id: $id, status: $status) {
        ${SUB_TASK_FIELDS}
    }
}
```

**`DELETE_SUB_TASK`**

```graphql
mutation DeleteSubTask($id: ID!) {
    deleteSubTask(id: $id) {
        id
    }
}
```

### `mutations/taskMutations.ts`

**`CREATE_TASK`**

```graphql
mutation CreateTask($title: String!, $projectId: ID!, $assignedTo: ID, $deadline: String, $priority: TaskPriority, $currentStatus: NewTaskStatus) {
    createTask(title: $title, projectId: $projectId, assignedTo: $assignedTo, deadline: $deadline, priority: $priority, currentStatus: $currentStatus) {
        ${TASK_FIELDS}
    }
}
```

**`UPDATE_TASK`**

```graphql
mutation UpdateTask($id: ID!, $title: String, $assignedTo: ID, $deadline: String, $priority: UpdateTaskPriority) {
    updateTask(id: $id, title: $title, assignedTo: $assignedTo, deadline: $deadline, priority: $priority) {
        ${TASK_FIELDS}
    }
}
```

**`UPDATE_TASK_STATUS`**

```graphql
mutation UpdateTaskStatus($id: ID!, $status: TaskStatus!) {
    updateTaskStatus(id: $id, status: $status) {
        ${TASK_FIELDS}
    }
}
```

**`DELETE_TASK`**

```graphql
mutation DeleteTask($id: ID!) {
    deleteTask(id: $id) {
        id
    }
}
```

### `mutations/userMutations.ts`

**`UPDATE_PROFILE`**

```graphql
mutation UpdateProfile($name: String, $number: String, $dob: String, $gender: String) {
    updateProfile(name: $name, number: $number, dob: $dob, gender: $gender) {
        id
        name
        email
        number
        dob
        gender
        role
    }
}
```

**`FORGOT_PASSWORD`**

```graphql
mutation ForgotPasswordMutation($email: String!) {
    forgotPassword(email: $email) {
        message
    }
}
```

**`RESET_PASSWORD`**

```graphql
mutation ResetPasswordMutation($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password) {
        message
    }
}
```

**`DELETE_USER`**

```graphql
mutation DeleteUser($userId: ID!) {
    deleteUser(userId: $userId) {
        id
    }
}
```

**`PROMOTE_TO_ADMIN`**

```graphql
mutation PromoteToAdmin($userId: ID!) {
    promoteToAdmin(userId: $userId) {
        id
        role
    }
}
```

**`CREATE_USER`**

```graphql
mutation CreateUser($name: String!, $email: String!, $number: String!, $gender: String!, $dob: String, $role: String, $clientId: ID, $mode: String, $password: String) {
    createUser(name: $name, email: $email, number: $number, gender: $gender, dob: $dob, role: $role, clientId: $clientId, mode: $mode, password: $password) {
        ${USER_FIELDS}
    }
}
```

**`UPDATE_USER`**

```graphql
mutation UpdateUser($id: ID!, $name: String, $email: String, $number: String, $gender: String, $dob: String) {
    updateUser(id: $id, name: $name, email: $email, number: $number, gender: $gender, dob: $dob) {
        ${USER_FIELDS}
    }
}
```

**`CHANGE_USER_ROLES`**

```graphql
mutation ChangeUserRoles($ids: [ID!]!, $role: String!, $clientId: ID) {
    changeUserRoles(ids: $ids, role: $role, clientId: $clientId) {
        ${USER_FIELDS}
    }
}
```

**`UNLOCK_USERS`**

```graphql
mutation UnlockUsers($ids: [ID!]!) {
    unlockUsers(ids: $ids) {
        ${USER_FIELDS}
    }
}
```

**`RESEND_INVITE`**

```graphql
mutation ResendInvite($id: ID!) {
    resendInvite(id: $id) {
        message
    }
}
```

**`DELETE_USERS`**

```graphql
mutation DeleteUsers($ids: [ID!]!) {
    deleteUsers(ids: $ids) {
        id
    }
}
```

**`CHANGE_PASSWORD`**

```graphql
mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
        message
    }
}
```

---

## 13. TypeScript Types

API payload shapes live in `src/types/`. They are reproduced here from the source files.

### `types/authTypes.ts`

```typescript
export interface Login {
  email: string;
  password: string;
}

export interface AuthResponse {
  login: {
    token: string;
  };
}

export interface Register {
  email: string;
  name: string;
  number: string;
  gender: string;
  dob: string;
  password: string;
}
```

### `types/clientTypes.ts`

```typescript
import type { User } from './userTypes';

export interface Client {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    deleteRequest: boolean;
    assignedAdmin: Pick<User, 'id' | 'name' | 'email'> | null;
}
```

### `types/commentTypes.ts`

```typescript
import type { User } from './userTypes';

export interface Comment {
    id: string;
    content: string;
    taskId: string;
    subTaskId: string | null;
    author: Pick<User, 'id' | 'name' | 'email'> | null;
    createdAt: string | null;
    updatedAt: string | null;
}
```

### `types/genericTypes.ts`

```typescript
export interface GraphqlResponse<T> {
  data: T;
  errors?: { message: string }[];
}
```

### `types/projectTypes.ts`

```typescript
import type { Client } from './clientTypes';
import type { User } from './userTypes';

export interface Project {
    id: string;
    name: string;
    description: string;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    dueDate?: string | null;
    client: Pick<Client, 'id' | 'name'> | null;
    user: Pick<User, 'id' | 'name' | 'email'>[];
}
```

### `types/subTaskTypes.ts`

```typescript
import type { User } from './userTypes';
import type { Priority, TaskStatus } from './taskTypes';

export interface SubTask {
    id: string;
    title: string;
    priority: Priority;
    deadline: string | null;
    currentStatus: TaskStatus;
    assignedTo: Pick<User, 'id' | 'name' | 'email'> | null;
    createdBy: Pick<User, 'id' | 'name' | 'email'> | null;
}
```

### `types/taskTypes.ts`

```typescript
import type { User } from './userTypes';

export type Priority = 'URGENT' | 'HIGH' | 'NORMAL' | 'BACKLOG';
export type TaskStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED';

export interface Task {
    id: string;
    title: string;
    priority: Priority;
    deadline: string | null;
    currentStatus: TaskStatus;
    assignedTo: Pick<User, 'id' | 'name' | 'email'> | null;
    createdBy: Pick<User, 'id' | 'name' | 'email'> | null;
    project: { id: string; name: string } | null;
    createdAt?: string | null;
    resolvedAt?: string | null;
    subTaskStats?: { done: number; total: number };
}
```

### `types/userTypes.ts`

```typescript
export type Role = 'SUPER_ADMIN' | 'CLIENT_ADMIN' | 'USER';
export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'INVITED';

export interface User {
  id: string;
  name: string;
  email: string;
  number: string;
  gender: string;
  dob: string | null;
  role: Role;
  /** Derived on the server: LOCKED after repeated failed sign-ins, INVITED until first sign-in */
  status?: AccountStatus;
  lastLoginAt?: string | null;
}

export interface ProfileResponse {
  profile: User;
}
```

---

## 14. Authentication Flow

### Login

```
User fills in email + password
         │
         ▼
UserAuthLoginForm dispatches LOGIN_REQUEST
         │
         ▼
loginUser(email, password) → POST /graphql
         │
    ┌────┴────┐
  Error     Success
    │          │
    ▼          ▼
Show error   Store token in Redux + localStorage
             Navigate to /dashboard
```

### Staying Logged In

On every app load (including page refresh), the Redux store reads the token from `localStorage` and validates it is not expired. If valid, the user is considered logged in and `ProtectedRoute` allows access to protected pages.

On every API request, `gql()` attaches the token; the WebSocket sends it when it connects. The backend verifies it on every call — no separate session management is needed.

### Logout

```
User clicks "Sign out" in the account menu
         │
         ▼
logout() removes the token and calls closeSocket()
         │
         ▼
Redux dispatches LOGOUT action
         │
         ▼
Root reducer receives LOGOUT — passes undefined to all slices
         │
         ▼
All slices reset to initial state (token, profile, all lists cleared)
         │
         ▼
React Router redirects to "/"
```

---

## 15. Notification System

### One live store

`src/hooks/use-notifications.ts` holds a single module-level list, shared by the header bell and the notifications sheet:

```
first subscriber (header mounts)
   ├─► getNotifications()                    load once, newest first
   ├─► subscribeToNotifications(cb)          WebSocket: notificationCreated
   │       └─ cb(n): skip if already in list → prepend → tell onNewNotification listeners
   ├─► onReconnect(refreshNotifications)     reload after the socket comes back
   └─► setInterval(refresh, 5 min)           safety net only
last unsubscribe (sign-out) → stop everything, clear the list
```

- `useNotifications()` returns the list through `useSyncExternalStore`.
- **The subscribe function must stay a stable module-level function.** An inline function re-subscribes on every render. That once caused a request loop of about 125k fetches, and `use-notifications.test.tsx` guards against it.
- `site-header.tsx` listens with `onNewNotification` and shows a toast with an **Open** action that opens the sheet.
- The bell shows a dot when anything is unread.

### Reading and clearing

All actions update the list optimistically and roll back (with an error toast) if the server call fails.

| Action | API call | Requests |
|---|---|---|
| Opening the sheet | — | none (nothing is marked read) |
| Click an unread notification | `markAsRead(id)` | 1 |
| "Mark all read" | `markAllAsRead()` | 1, whatever the count |
| Delete one | `deleteNotification(id)` | 1 |
| "Clear all" | `deleteAllNotifications()` | 1 |

`markNotificationsRead(ids)` is also available for marking a selection in one request.

### Server side, briefly

On the server, `notify()` queues the notification in BullMQ. The worker saves it and publishes it, and the server pushes it down this WebSocket. If Redis is down, the API saves it directly. See `docs/BACKEND.md` §14.

---

## 16. Theming and Styling

### Design tokens

`src/index.css` defines every colour as raw OKLCH channels on `:root`, with a second set under `.dark`:
- surfaces: `background`, `card`, `surface-2`, `surface-3`;
- text: `foreground`, `muted-foreground`, `subtle-foreground`;
- `border`, `border-strong`, `primary`, `accent`;
- charts: `chart-1` to `chart-4`.

`tailwind.config.js` maps them to classes such as `bg-card`, `text-muted-foreground` and `border-border-strong`. Screens use tokens and `components/pm/`, never raw palette colours or hex. That way both themes always work.

- **Tones:** ad-hoc status colours use `.tone-<hue> .tone-bg .tone-fg` (e.g. `tone-red`). These classes are deliberately outside `@layer`, because their names are built dynamically.
- **Numbers:** wrap figures in `.num` (Geist Mono, tabular) so columns line up.
- **Motion:** keyframes for entrances, sheets, toasts and form shake live in `tailwind.config.js`; `motion` handles sliding pills and page transitions.

### Dark mode

Tailwind's `class` strategy: the `dark` class on `<html>` switches every token.
- `useTheme()` (`components/hooks/use-theme.ts`) applies the saved Preference.
- Toggling switches immediately, saves to the server in the background, and caches the choice in `localStorage['pm-theme']` as a **plain string** (`"DARK"` / `"LIGHT"`).
- The inline script in `index.html` reads that value before React loads, so a reload never flashes the wrong theme.

### shadcn/ui

Accessible Radix-based primitives in `src/components/ui/` (Button, Dialog, Sheet, Popover, Select, Tooltip, Sidebar, …). They are owned by the project and restyled to the design. `Button` has the design's variants.

---

## 17. Reusable Hooks

All in `src/hooks/`. `index.ts` re-exports them, along with `useTheme`, `useIsMobile`, `useForm`, `useForms`, `useAppData` and `useTaskActions`.

| Hook | What it does | Used by |
|---|---|---|
| `useAsyncAction()` | `{ run, busy, error, setError }`. `run(fn)` ignores calls while one is in flight, so ⌘↵ plus a click can't double-submit. It stores the thrown message in `error` | Bulk role / unlock, decline request, manage team, request deletion |
| `useLocalStorage(key, initial, { raw?, isValid? })` | `useState` remembered in localStorage. Survives blocked storage. `raw` stores plain strings; `isValid` rejects stale values. `readStorage` / `writeStorage` are the non-hook versions | Dashboard range, theme cache |
| `useSelection(ids)` | Checkbox selection: `selected`, `isSelected`, `toggle`, `toggleAll`, `clear`, `allSelected`, `mixed`. Ids that leave the list drop out | Users table |
| `useOutside(ref, fn, active)` | Calls the latest `fn` on a mouse press outside `ref` | Combo, date picker |
| `useSubscription(query, onData, { variables?, enabled? })` | Keeps a GraphQL subscription open while mounted; resubscribes only when variables change | Ready for live task updates |
| `useNotifications()` / `onNewNotification()` | The live notification store (§15) | Header, notifications sheet |

`task-sheet.tsx` keeps its own save helper on purpose. It counts overlapping saves (several fields can save at once), and `useAsyncAction`'s single-flight guard would drop one of them.

---

## 18. Testing

```bash
npm test                                         # watch mode
npm run test:run                                 # single run
npx vitest run src/hooks/use-selection.test.ts   # one file
```

**Setup:**
- Vitest 0.34 (pinned for Vite 4), jsdom, Testing Library (React 14, user-event 14) and `@testing-library/jest-dom`.
- Globals (`describe`, `it`, `vi`) are on.
- `src/test/setup.ts` stubs `IntersectionObserver`, `ResizeObserver` and `matchMedia`, and cleans up the DOM, localStorage and mocks after each test.

**Test first:**
- Write the test, see it fail for the expected reason, then implement.
- For existing code without tests, add the test and prove it can fail (break the code on purpose, see red, restore).

**Conventions:**
- `🟢` marks happy paths, `🔴` marks failure and edge cases.
- Mock at the API boundary (`@/api/*Api`, `@/api/ws`) with `vi.mock`.
- Mock `react-redux` with a fake state object.
- For module-level stores, call `vi.resetModules()` and import dynamically per test. Import anything that must share a module instance with the component (e.g. `FormsContext`) dynamically as well.

**What's covered** (82 tests in 15 files):

| Area | Files |
|---|---|
| Hooks | `use-async-action`, `use-local-storage`, `use-selection`, `use-outside`, `use-subscription`, `use-notifications`, `use-theme` |
| API | `graphql` (error mapping), `ws` (URL, token, 4403, reconnect, dispose) |
| Notifications | `notifications-sheet` (click / bulk mark-read, rollback, live push), `site-header` (unread count, toast) |
| Forms | `async-forms` — five forms: save once, Saving…, errors, no double submit |
| Screens | `Users` (selection, filter, tabs), `AdminDashboard` (range remembered) |
| Auth | `authActions` (logout closes the socket) |

Most screens and the Tasks board don't have tests yet.
