# ProjoMan — Frontend Documentation

> A complete guide to the React application: how it is structured, every page, how state is managed, and how it talks to the backend.

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

---

## 1. Overview

The ProjoMan frontend is a **single-page application (SPA)** built with React and TypeScript. It communicates exclusively with the GraphQL backend API via HTTP POST requests using the Axios library.

When you load the app in a browser:

1. React renders the entire application in your browser — there is no page reload when navigating.
2. JWT authentication is checked on startup from `localStorage`.
3. Role-based routing ensures you only ever see pages your role is allowed to access.
4. All data is fetched from the GraphQL API and cached in the Redux store.
5. Notifications arrive in real time (via the backend's Redis PubSub system) or via a polling fallback every 30 seconds.

---

## 2. Project Structure

```
frontend/src/
│
├── App.tsx                   # Root component — providers + all routes defined here
├── main.tsx                  # Entry point — mounts App into the DOM
│
├── api/                      # HTTP communication layer
│   ├── authApi.ts            # login, register, forgotPassword, resetPassword
│   ├── userApi.ts            # getProfile, getUsers, updateProfile, deleteUser, promoteToAdmin
│   ├── clientApi.ts          # getClients, addClient, updateClient, assignAdmin, delete operations
│   ├── projectApi.ts         # getProjects, addProject, updateProject, deleteProject, team management
│   ├── taskApi.ts            # getTasks, createTask, updateTask, updateTaskStatus, deleteTask
│   ├── subTaskApi.ts         # getSubTasks, createSubTask, updateSubTask, updateSubTaskStatus, deleteSubTask
│   ├── notificationApi.ts    # getNotifications, markAsRead, markAllAsRead, delete operations
│   └── preferenceApi.ts      # getPreference, updatePreference
│
├── queries/                  # Raw GraphQL query strings
│   ├── userQueries.ts
│   ├── clientQueries.ts
│   ├── projectQueries.ts
│   ├── taskQueries.ts
│   ├── subTaskQueries.ts
│   └── notificationQueries.ts
│
├── mutations/                # Raw GraphQL mutation strings
│   ├── authMutations.ts
│   ├── userMutations.ts
│   ├── clientMutations.ts
│   ├── projectMutations.ts
│   ├── taskMutations.ts
│   ├── subTaskMutations.ts
│   └── notificationMutations.ts
│
├── types/                    # TypeScript interfaces for every entity
│   ├── authTypes.ts
│   ├── userTypes.ts
│   ├── clientTypes.ts
│   ├── projectTypes.ts
│   ├── taskTypes.ts
│   ├── subTaskTypes.ts
│   └── genericTypes.ts
│
├── redux/
│   ├── store/
│   │   └── store.ts          # Root Redux store — token validation on startup, LOGOUT reset
│   ├── reducers/             # One reducer per domain slice
│   ├── actions/              # Async thunks and simple dispatch functions
│   └── constants/            # Action type string constants
│
└── Screens/
    ├── Auth/                 # Login, Register, ForgotPassword, ResetPassword
    ├── Dashboard/            # Dashboard, Account, Users, Clients, Projects, Tasks, Kanban, Analytics
    ├── Components/           # Shared layout components (Sidebar, Header, Profile, etc.)
    ├── ui-Components/        # Auth form components
    └── RouteHandler/         # ProtectedRoute and PublicRoute wrappers
```

---

## 3. Getting Started

```bash
# From the repository root
cd frontend

# Install dependencies
npm install

# Start development server (available at http://localhost:4000)
npm run dev

# Build for production
npm run build

# Preview the production build locally
npm run preview
```

**Prerequisites:**
- Node.js 20+
- The backend API must be running on `http://localhost:8000`

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

Used for server mutations (form submissions like login, register). React Query makes it easy to track loading states and errors for individual operations without cluttering Redux.

### Axios

The HTTP client used to send all GraphQL requests to the backend. An **interceptor** (a function that runs on every request) automatically attaches the JWT token from `localStorage` to the `Authorization` header so the backend knows who is calling.

### Tailwind CSS

A utility-first CSS framework. Instead of writing custom CSS classes, you apply small utility classes directly in the HTML/JSX:

```html
<!-- Instead of a custom CSS class, use utility classes directly -->
<div class="flex items-center gap-4 bg-white rounded-lg shadow-sm p-4">
```

This makes styling fast and consistent. Dark mode is supported via Tailwind's `class` strategy — adding or removing a `dark` class on the root element switches the entire theme.

### shadcn/ui + Radix UI

Pre-built, accessible, unstyled UI components (buttons, dialogs, dropdowns, sheets, popovers). These handle the hard parts of UI — keyboard navigation, screen reader support, focus management — so the team can focus on the application logic.

---

## 5. How the Application Starts

When the browser loads the app, this sequence happens:

1. **`main.tsx`** mounts the `<App />` component into the DOM.
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

---

## 6. Routing and Access Control

All routes are defined in `App.tsx`.

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
| `/tasks` | Tasks | ProtectedRoute | All authenticated |
| `/kanban` | Kanban | ProtectedRoute | `USER` only |
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

---

### Login (`/`)

**What it does:** The entry point for all users.

**Layout:** Split-screen. Left side: dark branded panel with a testimonial quote. Right side: the login form.

**Form fields:**
- Email address
- Password

**What happens on submit:**
1. Dispatches `LOGIN_REQUEST` to Redux (triggers loading state).
2. Calls `loginUser(email, password)` API function.
3. On success: stores the token in Redux and `localStorage`, redirects to `/dashboard`.
4. On failure: displays the error message returned by the server.

**Links:** Forgot Password, Register, Terms of Service, Privacy Policy.

---

### Register (`/register`)

**What it does:** Creates a new user account.

**Form fields:**
- Email address
- Full name
- Phone number
- Gender (Male / Female / Others — dropdown)
- Date of birth (calendar date-picker)
- Password
- Confirm password

**Validation:** Password and confirm password must match (highlighted with a red border if they differ). Password must be at least 8 characters.

**What happens on submit:**
1. Dispatches `REGISTER_REQUEST`.
2. Calls `registerUser(data)` API function.
3. On success: navigates to `/` (login) automatically.
4. On failure: displays the error message.

**Date format sent to API:** `yyyy/MM/dd` (formatted via `date-fns`).

---

### Forgot Password (`/forgot-password`)

**What it does:** Starts the password reset process.

**Form fields:**
- Email address

**What happens on submit:**
1. Calls `forgotPassword(email)` API function.
2. On success: shows a "check your email" box with the server's message. The message is the same whether or not the account exists.
3. The server emails a link to `/reset-password?token=...` that expires in 1 hour. The token is never returned to the browser.

---

### Reset Password (`/reset-password`)

**What it does:** Sets a new password using a reset token.

**Form fields:**
- Reset token (pre-filled from the emailed link's `?token=` parameter, otherwise manual entry)
- New password
- Confirm new password

**What happens on submit:**
1. Validates passwords match (red border if not).
2. Calls `resetPassword(token, newPassword)` API function.
3. On success: shows a success message and redirects to `/` after 2 seconds.
4. On failure: displays the error (e.g., "Token expired").

---

### Dashboard (`/dashboard`)

**Who sees it:** All authenticated users.

**What it shows:** Analytics overview via the `AnalyticsDashboard` component — stat cards, donut charts, and progress bars.

The dashboard acts as a summary view. Clicking on stats can drill down to the relevant filtered page (e.g., clicking a project status stat navigates to the Projects page filtered by that status).

**Layout:** Wrapped in the standard `AppLayout` (sidebar + header).

---

### Account (`/account`)

**Who sees it:** All authenticated users.

**What it shows:** The logged-in user's own profile and preferences.

**Profile section:**
- View: name, email, phone, date of birth, gender, role.
- Edit: click "Edit" to open an inline form for name, phone, DOB, and gender.
- Calls `updateProfile(data)` on save.

**Preferences section:**
- View and change theme (Light / Dark).
- View and change language (English / Japanese / Korean).
- Calls `updatePreference(data)` on change.

---

### Users (`/users`)

**Who sees it:** `SUPER_ADMIN` only.

**What it shows:** A table of all users in the system, excluding the currently logged-in user and other SUPER_ADMINs.

**Table columns:** Name, Email, Phone, Gender, Role, Date of Birth.

**Features:**

| Feature | How to Use |
|---|---|
| Search | Type in the search box to filter by name or email |
| Role filter | Dropdown to show: All / Super Admins / Client Admins / Users |
| View details | Click any row to open a slide-in details panel |
| Promote to Admin | Click the "Promote" button — confirmation dialog appears, calls `promoteToAdmin(userId)` |
| Delete user | Click the "Delete" button — confirmation dialog appears, calls `deleteUser(userId)` |

**After promote:** Redux updates the user's role in-store. No re-fetch needed.

**After delete:** Redux removes the user from the in-store list. No re-fetch needed.

---

### Clients (`/clients`)

**Who sees it:** `SUPER_ADMIN`, `CLIENT_ADMIN`.

**What it shows:** A table of clients (companies).

**Table columns:** Company Name, Email, Phone, Assigned Admin, Delete Request status.

**Filters:**
- Pending Deletion (shows only clients where `deleteRequest: true`)
- Unassigned (shows only clients with no assigned admin)

**SUPER_ADMIN features:**

| Feature | Action |
|---|---|
| Create client | Click "Add Client" — form with name, email, phone, optional admin assignment |
| Edit client | Click "Edit" on any row — updates name, email, phone |
| Assign admin | Click "Assign Admin" — dropdown shows all CLIENT_ADMIN users who are not yet assigned to another client |
| Request deletion | Flags the client (`deleteRequest: true`) — a CLIENT_ADMIN step, but SUPER_ADMIN can see the flag |
| Force delete | Immediately deletes the client without requiring the flag |
| Confirm delete | Deletes a client that was flagged by CLIENT_ADMIN |

**CLIENT_ADMIN features:**

| Feature | Action |
|---|---|
| View own client | Can see their assigned client's details |
| Edit own client | Can update name, email, phone |
| Request deletion | Calls `confirmDeleteClient(id)` — sets the `deleteRequest` flag for SUPER_ADMIN to action |

---

### Projects (`/projects`)

**Who sees it:** All authenticated users.

**What it shows:** A table of projects visible to the current user (scoped by role).

**Table columns:** Project Name, Status, Client, Team Size.

**Status filter:** NOT_STARTED / IN_PROGRESS / COMPLETED (dropdown).

**SUPER_ADMIN / CLIENT_ADMIN features:**

| Feature | Action |
|---|---|
| Create project | Form: name, description, client (dropdown), status |
| Edit project | Update name, description, status |
| Delete project | Confirmation dialog |
| Manage team | Open a "Team" panel — add USERs by name search, remove existing members |

**USER features:** Read-only — can see their assigned projects but cannot create, edit, or delete.

**Adding users to a project:**
- Only users with the `USER` role appear in the team assignment dropdown.
- Admins (`SUPER_ADMIN`, `CLIENT_ADMIN`) cannot be assigned to projects as team members.
- Selecting a user and clicking "Add" calls `addUserToProject({ id: projectId, users: [userId] })`.

---

### Tasks (`/tasks`)

**Who sees it:** All authenticated users.

**What it shows:** A two-section hierarchical view.

**Section 1 — Tasks:**
1. Select a project from the dropdown at the top.
2. The table below shows all tasks for that project.
3. Click a task row to expand and show its sub-tasks (in Section 2).

**Task table columns:** Title, Priority, Status, Assignee, Due Date, Created By.

**Section 2 — Sub-Tasks:**
1. Select a task to load its sub-tasks.
2. The sub-task table shows below.

**Sub-task table columns:** Title, Priority, Status, Assignee, Due Date.

**SUPER_ADMIN / CLIENT_ADMIN features (Tasks):**

| Feature | Action |
|---|---|
| Create task | Title, assignee (USER role only), deadline, priority |
| Edit task | Update title, assignee, deadline, priority |
| Update status | Dropdown: NEW / IN_PROGRESS / RESOLVED / REOPENED |
| Delete task | Confirmation dialog — also deletes all sub-tasks |
| Search | Filter task list by title |

**USER features (Tasks):** Can update status and details of tasks assigned to them only.

**SUPER_ADMIN / CLIENT_ADMIN / USER features (Sub-Tasks):**

| Feature | Who | Notes |
|---|---|---|
| Create sub-task | SUPER_ADMIN, CLIENT_ADMIN, USER (if on parent task) | Title, assignee, deadline, priority |
| Edit sub-task | SUPER_ADMIN, CLIENT_ADMIN, assigned USER | |
| Update status | SUPER_ADMIN, CLIENT_ADMIN, assigned USER | |
| Delete sub-task | SUPER_ADMIN, CLIENT_ADMIN, creating USER | Users can only delete their own |

> **Assignee restriction:** Only users with the `USER` role can be assigned to tasks and sub-tasks. Admin users do not appear in the assignee dropdown.

---

### Kanban (`/kanban`)

**Who sees it:** `USER` only.

**What it shows:** A Kanban board — four columns representing the four task statuses.

| Column | Status |
|---|---|
| To Do | NEW |
| In Progress | IN_PROGRESS |
| Done | RESOLVED |
| Reopened | REOPENED |

**How it works:**
1. Select a project from the dropdown at the top.
2. Tasks assigned to the logged-in user for that project appear as cards.
3. Each card shows: title, priority badge, assignee name, due date.
4. Click a card to open a detail sheet on the right.
5. The sheet shows full task details and buttons to change status.
6. Clicking a status button calls `updateTaskStatus(id, status)` immediately.

**Design intent:** The Kanban board is the USER's primary workspace — a simple, visual way to see what they need to work on and move tasks forward without navigating through tables.

---

### Analytics (`/analytics`)

**Who sees it:** `SUPER_ADMIN`, `CLIENT_ADMIN`.

**What it shows:** Charts and statistics giving a management overview of the work happening in the system — project statuses, task completion rates, priority breakdowns.

Rendered via the `AnalyticsDashboard` component using donut charts, stat cards, and progress bars.

---

## 8. Components — Shared Building Blocks

These components are reused across multiple pages.

---

### AppLayout

**File:** `Screens/Components/AppLayout.tsx`

**Purpose:** The standard page wrapper. Every protected page uses this.

**What it renders:**
- `AppSidebar` on the left (collapsible).
- `SiteHeader` at the top.
- The page's children content in the main area.

**Usage:**
```tsx
<AppLayout>
  <YourPageContent />
</AppLayout>
```

---

### AppSidebar

**File:** `Screens/Components/app-sidebar.tsx`

**Purpose:** The left navigation panel.

**What it renders:**
- ProjoMan logo at the top, linking to `/dashboard`.
- Navigation links — different links are shown based on the logged-in user's role.
- The current user's name and avatar at the bottom, with a menu for profile and logout.

**Navigation per role:**

| Role | Links Shown |
|---|---|
| `SUPER_ADMIN` | Dashboard, Users, Clients, Projects, Tasks |
| `CLIENT_ADMIN` | Dashboard, Clients, Projects, Tasks, Analytics |
| `USER` | Dashboard, Projects, Tasks, Kanban |

**On mount:** Fetches the user's profile and preference (to apply the correct theme).

---

### SiteHeader

**File:** `Screens/Components/site-header.tsx`

**Purpose:** The top bar displayed on every page.

**What it renders:**
- The current page's title (determined from the URL path).
- A notification bell icon with a badge showing unread count.
- A notification popover (opens on bell click) that shows all notifications.

**Notification popover features:**
- List of all notifications with an unread indicator (blue dot).
- "Mark as read" button per notification.
- "Mark all as read" button.
- "Delete" button per notification.
- "Clear all" button.
- Time-ago display ("2 minutes ago", "yesterday", etc.).

**Polling:** Notifications are re-fetched every **30 seconds** via `setInterval` to catch any notifications that arrived when the WebSocket subscription was not active.

---

### ProfileContent

**File:** `Screens/Components/profile-content.tsx`

**Purpose:** Renders the profile edit form on the Account page.

**What it contains:**
- View mode: displays current name, email, phone, DOB, gender, role.
- Edit mode: inline form to update name, phone, DOB, and gender.
- Preference section: theme toggle (Light / Dark) and language selector.

---

### User Auth Form

**File:** `Screens/ui-Components/user-auth-form.tsx`

**Purpose:** The actual login and registration forms (used by the Login and Register pages).

**`UserAuthLoginForm`:**
- Email and password inputs.
- Forgot password link.
- Disabled social login buttons (Github, Google, Apple — placeholders for future implementation).
- On submit: dispatches to Redux → API call → stores token → navigates to `/dashboard`.

**`UserAuthRegisterForm`:**
- All registration fields (see Register page above).
- Date picker using a calendar popover (Radix UI).
- Password confirmation with real-time match validation.

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
  tasks: Task[],
  selectedProjectId: string | null,
  error: string | null
}
```

**Thunk: `fetchTasks(projectId)`** — caches per project ID. If tasks are already loaded for the same project, skips the API call.

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

All API files follow the same pattern:

1. Import the relevant GraphQL query/mutation string.
2. Send an Axios POST to `/graphql` with `{ query, variables }`.
3. Return the data from the response.

**Axios interceptor** (configured once, applies to all requests):

```typescript
// Automatically adds the JWT token to every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### API Functions Reference

#### authApi.ts

| Function | Operation | Args | Returns |
|---|---|---|---|
| `loginUser` | `LoginMutation` | `{ email, password }` | `{ token }` |
| `registerUser` | `RegisterMutation` | `{ name, email, number, dob, password, gender }` | `{ name }` |
| `forgotPassword` | `ForgotPasswordMutation` | `{ email }` | `{ message }` |
| `resetPassword` | `ResetPasswordMutation` | `{ token, password }` | `{ message }` |

#### userApi.ts

| Function | Operation | Args | Returns |
|---|---|---|---|
| `getProfile` | `GetProfile` query | — | `User` |
| `getUsers` | `GetUsers` query | — | `User[]` |
| `updateProfile` | `UpdateProfile` mutation | `{ name?, number?, dob?, gender? }` | `User` |
| `deleteUser` | `DeleteUser` mutation | `{ userId }` | void |
| `promoteToAdmin` | `PromoteToAdmin` mutation | `{ userId }` | `User` |

#### clientApi.ts

| Function | Operation | Args | Returns |
|---|---|---|---|
| `getClients` | `GetClients` query | — | `Client[]` |
| `addClient` | `AddClient` mutation | `{ name, email, phone, assignedAdmin? }` | `Client` |
| `updateClient` | `UpdateClient` mutation | `{ id, name, email, phone, assignedAdmin? }` | `Client` |
| `confirmDeleteClient` | `ConfirmDeleteClient` mutation | `{ id }` | void |
| `deleteClientBySuperAdmin` | `DeleteClientBySuperAdmin` mutation | `{ id }` | void |
| `forceDeleteClient` | `ForceDeleteClient` mutation | `{ id }` | void |
| `assignAdmin` | `AssignAdmin` mutation | `{ id, assignedAdmin }` | `Client` |

#### projectApi.ts

| Function | Operation | Args | Returns |
|---|---|---|---|
| `getProjects` | `GetProjects` query | — | `Project[]` |
| `addProject` | `CreateProject` mutation | `{ name, clientId, description?, status? }` | `Project` |
| `updateProject` | `UpdateProject` mutation | `{ id, name?, description?, status? }` | `Project` |
| `deleteProject` | `DeleteProject` mutation | `{ id }` | void |
| `addUserToProject` | `AddUserToProject` mutation | `{ id, users: string[] }` | `Project` |
| `removeUserFromProject` | `RemoveUserFromProject` mutation | `{ id, users: string[] }` | `Project` |

#### taskApi.ts

| Function | Operation | Args | Returns |
|---|---|---|---|
| `getTasks` | `GetTasks` query | `{ projectId }` | `Task[]` |
| `createTask` | `CreateTask` mutation | `{ title, projectId, assignedTo?, deadline?, priority? }` | `Task` |
| `updateTask` | `UpdateTask` mutation | `{ id, title?, assignedTo?, deadline?, priority? }` | `Task` |
| `updateTaskStatus` | `UpdateTaskStatus` mutation | `{ id, status }` | `Task` |
| `deleteTask` | `DeleteTask` mutation | `{ id }` | void |

#### subTaskApi.ts

| Function | Operation | Args | Returns |
|---|---|---|---|
| `getSubTasks` | `GetSubTasks` query | `{ taskId }` | `SubTask[]` |
| `createSubTask` | `CreateSubTask` mutation | `{ title, taskId, assignedTo?, deadline?, priority? }` | `SubTask` |
| `updateSubTask` | `UpdateSubTask` mutation | `{ id, title?, assignedTo?, deadline?, priority? }` | `SubTask` |
| `updateSubTaskStatus` | `UpdateSubTaskStatus` mutation | `{ id, status }` | `SubTask` |
| `deleteSubTask` | `DeleteSubTask` mutation | `{ id }` | void |

#### notificationApi.ts

| Function | Operation | Args | Returns |
|---|---|---|---|
| `getNotifications` | `GetNotifications` query | — | `Notification[]` |
| `markAsRead` | `MarkAsRead` mutation | `{ id }` | void |
| `markAllAsRead` | `MarkAllAsRead` mutation | — | void |
| `deleteNotification` | `DeleteNotification` mutation | `{ id }` | void |
| `deleteAllNotifications` | `DeleteAllNotifications` mutation | — | void |

---

## 11. GraphQL Queries Reference

The raw GraphQL strings sent to the backend.

### Profile

```graphql
query GetProfile {
  profile {
    name
    email
    number
    dob
    gender
    role
  }
}
```

### Users

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
  }
}
```

### Clients

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

### Projects

```graphql
query GetProjects {
  projects {
    id
    name
    description
    status
    client {
      id
      name
    }
    user {
      id
      name
      email
    }
  }
}
```

### Tasks

```graphql
query GetTasks($projectId: ID!) {
  tasks(projectId: $projectId) {
    id
    title
    priority
    deadline
    currentStatus
    assignedTo {
      id
      name
      email
    }
    createdBy {
      id
      name
      email
    }
    project {
      id
      name
    }
  }
}
```

### Sub-Tasks

```graphql
query GetSubTasks($taskId: ID!) {
  subTasks(taskId: $taskId) {
    id
    title
    priority
    deadline
    currentStatus
    assignedTo {
      id
      name
      email
    }
    createdBy {
      id
      name
      email
    }
  }
}
```

### Notifications

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

---

## 12. GraphQL Mutations Reference

### Login

```graphql
mutation LoginMutation($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    token
  }
}
```

### Register

```graphql
mutation RegisterMutation(
  $name: String!
  $email: String!
  $number: String!
  $dob: String!
  $password: String!
  $gender: String!
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

### Forgot Password

```graphql
mutation ForgotPasswordMutation($email: String!) {
  forgotPassword(email: $email) {
    message
  }
}
```

### Reset Password

```graphql
mutation ResetPasswordMutation($token: String!, $password: String!) {
  resetPassword(token: $token, password: $password) {
    message
  }
}
```

### Update Profile

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

### Create Task

```graphql
mutation CreateTask(
  $title: String!
  $projectId: ID!
  $assignedTo: ID
  $deadline: String
  $priority: TaskPriority
) {
  createTask(
    title: $title
    projectId: $projectId
    assignedTo: $assignedTo
    deadline: $deadline
    priority: $priority
  ) {
    id
    title
    priority
    deadline
    currentStatus
    assignedTo { id name email }
    createdBy { id name email }
    project { id name }
  }
}
```

### Update Task Status

```graphql
mutation UpdateTaskStatus($id: ID!, $status: TaskStatus!) {
  updateTaskStatus(id: $id, status: $status) {
    id
    currentStatus
  }
}
```

*(Other mutations follow the same pattern — see the `/mutations` directory for the complete strings.)*

---

## 13. TypeScript Types

All entities have TypeScript interfaces defined in `src/types/`.

### User

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  number: string;
  gender: string;       // "MALE" | "FEMALE" | "OTHERS"
  dob: string;
  role: string;         // "SUPER_ADMIN" | "CLIENT_ADMIN" | "USER"
}
```

### Client

```typescript
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  deleteRequest: boolean;
  assignedAdmin: {
    id: string;
    name: string;
    email: string;
  } | null;
}
```

### Project

```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  client: { id: string; name: string } | null;
  user: { id: string; name: string; email: string }[];
}
```

### Task

```typescript
interface Task {
  id: string;
  title: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'BACKLOG';
  deadline: string;
  currentStatus: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED';
  assignedTo: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string } | null;
  project: { id: string; name: string } | null;
}
```

### SubTask

```typescript
interface SubTask {
  id: string;
  title: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'BACKLOG';
  deadline: string;
  currentStatus: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED';
  assignedTo: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string } | null;
}
```

### Notification

```typescript
interface Notification {
  id: string;
  content: string;
  status: 'READ' | 'UNREAD';
  createdAt: string;
}
```

### Generic API Response

```typescript
interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
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

On every API request, the Axios interceptor attaches the token. The backend verifies it on every call — no separate session management is needed.

### Logout

```
User clicks "Logout" in the sidebar user menu
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
localStorage.removeItem('token')
         │
         ▼
React Router redirects to "/"
```

---

## 15. Notification System

### How the Frontend Receives Notifications

The backend can push notifications via a GraphQL Subscription (WebSocket). If the WebSocket is not connected (or the browser tab is in the background), the frontend polls as a fallback.

**Polling setup** (in `SiteHeader`):

```typescript
useEffect(() => {
  fetchNotifications();                      // Fetch immediately on mount

  const interval = setInterval(() => {
    fetchNotifications();                    // Re-fetch every 30 seconds
  }, 30000);

  return () => clearInterval(interval);      // Clean up on unmount
}, []);
```

### Notification Bell Badge

The unread count is derived by filtering the notifications array for items with `status: 'UNREAD'`. The badge shows this count. If count is 0, no badge is shown.

### Interacting with Notifications

All notification interactions are immediate — they call the API and then update the local state:

| Action | API Call | Local State Update |
|---|---|---|
| Click notification | `markAsRead(id)` | Sets `status: 'READ'` for that item |
| "Mark all read" | `markAllAsRead()` | Sets all to `status: 'READ'` |
| Delete one | `deleteNotification(id)` | Removes item from list |
| "Clear all" | `deleteAllNotifications()` | Empties list |

---

## 16. Theming and Styling

### Tailwind CSS

All styling is done with Tailwind utility classes applied directly in JSX. There are no separate `.css` files for individual components.

### Dark Mode

Tailwind's `class` strategy is used for dark mode. When the `dark` class is present on the `<html>` element, Tailwind applies all `dark:` prefixed classes.

**Toggling dark mode:**

Updating the user's theme preference via `updatePreference({ theme: 'DARK' })` should trigger adding the `dark` class to the document root. The preference is stored in the backend and retrieved on login.

### CSS Variables

Base colours are defined as CSS custom properties (CSS variables) in the global stylesheet. Tailwind classes reference these variables via the `@theme` configuration, ensuring consistent colours across light and dark modes.

### shadcn/ui Components

shadcn/ui is a collection of copy-pasted, customisable Radix UI components. They live in `src/components/ui/`. These are fully owned by the project — unlike a library, they can be modified directly:

| Component | Used In |
|---|---|
| `Button` | Everywhere |
| `Dialog` | Confirmation dialogs (delete, promote) |
| `Sheet` | Slide-in detail panels |
| `Popover` | Notification bell, date picker |
| `Select` | Dropdowns (status, role, client, assignee) |
| `Input` | All text input fields |
| `Table` | Users, Clients, Projects, Tasks pages |
| `Badge` | Priority and status indicators |
| `Separator` | Visual dividers |
| `Calendar` | Date of birth and deadline picker |
| `Tooltip` | Action button hints |
