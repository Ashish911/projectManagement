# Frontend Routes

All client-side routing is handled by React Router v6 (`BrowserRouter`).  
Route guards live in `src/Screens/RouteHandler/RouteNavigator.tsx`.

---

## Route Guards

| Guard | Behaviour |
|-------|-----------|
| `ProtectedRoute` | Requires a valid JWT in Redux store. Optionally checks `roles[]` — redirects to `/` if token missing or role not allowed. |
| `PublicRoute` | Redirects to `/dashboard` if a token already exists (prevents logged-in users from seeing auth screens). |

---

## Public Routes (no token required)

| Path | Component | File | Description |
|------|-----------|------|-------------|
| `/` | `Login` | `Screens/Auth/Login.tsx` | Split-layout login form; links to Register + Forgot Password |
| `/register` | `Register` | `Screens/Auth/Register.tsx` | Registration form — name, email, phone, dob, password, gender |
| `/forgot-password` | `ForgotPassword` | `Screens/Auth/ForgotPassword.tsx` | Enter email → reset link is emailed; shows "check your email" |
| `/reset-password` | `ResetPassword` | `Screens/Auth/ResetPassword.tsx` | Opened from the emailed link (`?token=`); new password; redirects to `/` on success |

---

## Protected Routes (token required)

| Path | Component | File | Roles | Description |
|------|-----------|------|-------|-------------|
| `/dashboard` | `Dashboard` | `Screens/Dashboard/Dashboard.tsx` | All | Analytics overview — stat cards, donut charts, drilldown navigation |
| `/account` | `Account` | `Screens/Dashboard/Account.tsx` | All | Profile edit + preferences (theme, language) |
| `/users` | `Users` | `Screens/Dashboard/Users.tsx` | `SUPER_ADMIN` | User list — search, filter by role, view details, promote, delete |
| `/clients` | `Clients` | `Screens/Dashboard/Clients.tsx` | `SUPER_ADMIN`, `CLIENT_ADMIN` | Client management — CRUD, assign admin, delete request flow |
| `/projects` | `Projects` | `Screens/Dashboard/Projects.tsx` | All | Project management — CRUD, team member assignment, status filter |
| `/tasks` | `Tasks` | `Screens/Dashboard/Tasks.tsx` | All | Task + SubTask management — two-panel UI, CRUD, status/priority |
| `/kanban` | `Kanban` | `Screens/Dashboard/Kanban.tsx` | `USER` | Kanban board — 4-column view (NEW / IN_PROGRESS / RESOLVED / REOPENED) |
| `/analytics` | `Analytics` | `Screens/Dashboard/Analytics.tsx` | `SUPER_ADMIN`, `CLIENT_ADMIN` | Full analytics dashboard |

---

## Sidebar Navigation (role-based)

The sidebar in `app-sidebar.tsx` renders different nav items per role:

| Role | Nav Items |
|------|-----------|
| `SUPER_ADMIN` | Dashboard, Users, Clients, Projects, Tasks |
| `CLIENT_ADMIN` | Dashboard, Clients, Projects, Tasks, Analytics |
| `USER` | Dashboard, Projects, Tasks, Kanban |

---

## Screen Inventory

### Auth Screens

#### `Login.tsx`
- Split layout — dark branding panel (left) + form (right)
- Uses `UserAuthLoginForm` from `ui-Components/user-auth-form.tsx`
- On success: stores JWT in Redux + localStorage → redirects to `/dashboard`

#### `Register.tsx`
- Same split layout as Login
- Uses `UserAuthRegisterForm`
- Fields: name, email, phone, dob, gender, password

#### `ForgotPassword.tsx`
- Enter email → calls `forgotPassword()` mutation
- Shows the server's generic "if an account exists, a link has been sent" message (same for unknown emails)
- The server emails a link to `/reset-password?token=...`; the token is never returned to the browser

#### `ResetPassword.tsx`
- Accepts token via `location.state` or manual text input
- Password + Confirm Password with real-time match validation
- On success: redirects to `/` after 2 seconds

---

### Dashboard Screens

#### `Dashboard.tsx`
- Wraps `AnalyticsDashboard` in `AppLayout`
- Entry point after login

#### `Account.tsx`
- `ProfileHeader` — avatar with initials, name, role badge, contact info
- `ProfileContent` — tabbed:
  - **Profile tab**: read + inline edit (name, phone, dob, gender)
  - **Preferences tab**: theme (`LIGHT`/`DARK`) + language (`ENGLISH`/`JAPANESE`/`KOREAN`)

#### `Users.tsx` *(SUPER_ADMIN only)*
- Lists all users excluding self and other SUPER_ADMINs
- Search bar (name or email)
- Role filter dropdown (clears with "Clear filter ×")
- Per-user actions:
  - **View** → side sheet with full profile + **Promote to Client Admin** button (USER role only)
  - **Delete** → confirmation dialog
- Redux: `usersList.users`, `usersList.roleFilter`
- API: `fetchUsers`, `deleteUser`, `promoteToAdmin`

#### `Clients.tsx` *(SUPER_ADMIN + CLIENT_ADMIN)*
- Table: name, email, phone, delete-request flag, assigned admin, actions
- Search bar + filter (Pending Deletion / Unassigned)
- Role-conditional actions:
  - **SUPER_ADMIN**: Create, Assign Admin, Force Delete, approve delete requests
  - **CLIENT_ADMIN**: Edit only (own client)
- Dialogs: Create, Edit, Assign Admin, Confirm Delete Request, Force Delete
- Redux: `clients.clients`, `clients.activeFilter`
- API: `getClients`, `addClient`, `updateClient`, `confirmDeleteClient`, `forceDeleteClient`, `assignAdmin`

#### `Projects.tsx` *(All authenticated)*
- Table/list with search + status filter (`NOT_STARTED` / `IN_PROGRESS` / `COMPLETED`)
- Actions: Create, Edit, Delete, Manage Team (add/remove users)
- Client selection required on create
- Redux: `projects.projects`, `projects.statusFilter`
- API: `getProjects`, `addProject`, `updateProject`, `deleteProject`, `addUserToProject`, `removeUserFromProject`

#### `Tasks.tsx` *(All authenticated)*
- Two-panel layout: **Tasks** (left) + **SubTasks** (right)
- Select a project → loads its tasks; select a task → loads its subtasks
- Create / Edit / Delete for both tasks and subtasks
- Priority: `URGENT` / `HIGH` / `NORMAL` / `BACKLOG`
- Status: `NEW` / `IN_PROGRESS` / `RESOLVED` / `REOPENED`
- Assignment to users (filtered to project members)
- Redux: `tasks.tasks`, `tasks.selectedProjectId`, `subTasks.subTasks`
- API: `getTasks`, `createTask`, `updateTask`, `updateTaskStatus`, `deleteTask`, `getSubTasks`, `createSubTask`, `updateSubTask`, `updateSubTaskStatus`, `deleteSubTask`

#### `Kanban.tsx` *(USER only)*
- 4-column board: NEW → IN_PROGRESS → RESOLVED → REOPENED
- Select project → tasks shown as cards in their status column
- Click card → detail sheet with status-change buttons
- No drag-and-drop yet — status updated via buttons
- Redux: `tasks.tasks`

#### `Analytics.tsx` *(SUPER_ADMIN + CLIENT_ADMIN)*
- Renders `AnalyticsDashboard` (same as `/dashboard` but role-gated)

---

### Shared Layout Components

#### `AppLayout.tsx`
- Wraps every dashboard screen
- Composes: `SidebarProvider` → `AppSidebar` + `SidebarInset` → `SiteHeader` + content slot
- CSS vars: `--sidebar-width: 14rem`, `--header-height: 3rem`

#### `app-sidebar.tsx`
- Collapsible offcanvas sidebar
- Logo "ProjoMan" → `/dashboard`
- On mount: fetches `profile` + `preference`
- `NavMain` — role-based menu items
- `NavUser` — footer with avatar, name, logout

#### `site-header.tsx`
- Page title resolved from `PAGE_TITLES` map keyed by current path
- `SidebarTrigger` (hamburger)
- Notifications bell → popover
  - Polls `getNotifications()` every **30 seconds**
  - Per-notification: Mark as Read, Delete
  - Bulk: Mark All as Read, Delete All
  - Time-ago formatting (minutes / hours / days)

#### `AnalyticsDashboard.tsx`
- Stat cards: Total Users, Total Clients, Total Projects, In-Progress Projects
- Donut chart: Project Status breakdown
- Donut chart: User Role distribution
- Multi-row charts: Client Health, Largest Project Teams
- Clicking a stat or chart segment navigates to the relevant page with filters pre-applied
- API: `fetchUsers`, `fetchClients`, `fetchProjects` (pulls from Redux or fetches fresh)

---

## API → GraphQL Operation Map

All API calls use raw Axios POST to `$VITE_API_URL/graphql`. There is no Apollo Client.

| API Function | Operation Name | Type |
|---|---|---|
| `loginUser` | `LoginMutation` | Mutation |
| `registerUser` | `RegisterMutation` | Mutation |
| `forgotPassword` | `ForgotPasswordMutation` | Mutation |
| `resetPassword` | `ResetPasswordMutation` | Mutation |
| `getProfile` | `GetProfile` | Query |
| `getUsers` | `GetUsers` | Query |
| `deleteUser` | `DeleteUser` | Mutation |
| `updateProfile` | `UpdateProfile` | Mutation |
| `promoteToAdmin` | `PromoteToAdmin` | Mutation |
| `getClients` | `GetClients` | Query |
| `addClient` | `AddClient` | Mutation |
| `updateClient` | `UpdateClient` | Mutation |
| `confirmDeleteClient` | `ConfirmDeleteClient` | Mutation |
| `deleteClientBySuperAdmin` | `DeleteClientBySuperAdmin` | Mutation |
| `forceDeleteClient` | `ForceDeleteClient` | Mutation |
| `assignAdmin` | `AssignAdmin` | Mutation |
| `getProjects` | `GetProjects` | Query |
| `addProject` | `AddProject` | Mutation |
| `updateProject` | `UpdateProject` | Mutation |
| `deleteProject` | `DeleteProject` | Mutation |
| `addUserToProject` | `AddUserToProject` | Mutation |
| `removeUserFromProject` | `RemoveUserFromProject` | Mutation |
| `getTasks` | `GetTasks` | Query |
| `createTask` | `CreateTask` | Mutation |
| `updateTask` | `UpdateTask` | Mutation |
| `updateTaskStatus` | `UpdateTaskStatus` | Mutation |
| `deleteTask` | `DeleteTask` | Mutation |
| `getSubTasks` | `GetSubTasks` | Query |
| `createSubTask` | `CreateSubTask` | Mutation |
| `updateSubTask` | `UpdateSubTask` | Mutation |
| `updateSubTaskStatus` | `UpdateSubTaskStatus` | Mutation |
| `deleteSubTask` | `DeleteSubTask` | Mutation |
| `getNotifications` | `GetNotifications` | Query |
| `markAsRead` | `MarkAsRead` | Mutation |
| `markAllAsRead` | `MarkAllAsRead` | Mutation |
| `deleteNotification` | `DeleteNotification` | Mutation |
| `deleteAllNotifications` | `DeleteAllNotifications` | Mutation |
| `getPreference` | `GetPreference` | Query |
| `updatePreference` | `UpdatePreference` | Mutation |
