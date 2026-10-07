# Frontend Routes

All client-side routing uses React Router v6 (`BrowserRouter`). Routes are declared in `src/App.tsx`. The guards live in `src/Screens/RouteHandler/RouteNavigator.tsx`.

---

## Route Guards

| Guard | Behaviour |
|-------|-----------|
| `ProtectedRoute` | Needs a token in the Redux `login` slice, otherwise it redirects to `/`. With `roles`, it waits for the profile, then redirects to `/dashboard` if the role isn't listed. |
| `PublicRoute` | Redirects to `/dashboard` if a token already exists. |

Signed-in routes are children of a single `ProtectedRoute` → `AppLayout` route: sidebar, header, page transition and `FormsProvider`. Screens render only their own content.

---

## Public Routes

| Path | Component | File | Description |
|------|-----------|------|-------------|
| `/` | `Login` | `Screens/Auth/Login.tsx` | Login form; links to Register and Forgot Password |
| `/register` | `Register` | `Screens/Auth/Register.tsx` | Name, email, phone, dob, gender, password |
| `/forgot-password` | `ForgotPassword` | `Screens/Auth/ForgotPassword.tsx` | Enter email; the server emails a reset link and the screen shows "check your email" |
| `/reset-password` | `ResetPassword` | `Screens/Auth/ResetPassword.tsx` | Opened from the emailed reset or invite link (`?token=`); set a new password, then redirect to `/`. Invite links add `&invite=1`, which the screen currently ignores |

---

## Protected Routes

| Path | Component | File | Roles | Description |
|------|-----------|------|-------|-------------|
| `/dashboard` | `Dashboard` | `Screens/Dashboard/Dashboard.tsx` | All | `MemberDashboard` for `USER`, `AdminDashboard` for super and client admins |
| `/account` | `Account` | `Screens/Dashboard/Account.tsx` | All | Profile edit and preferences (theme, language) |
| `/users` | `Users` | `Screens/Dashboard/Users.tsx` | `SUPER_ADMIN` | Users table, role tabs, search, selection with bulk actions |
| `/clients` | `Clients` | `Screens/Dashboard/Clients.tsx` | `SUPER_ADMIN`, `CLIENT_ADMIN` | Clients table and detail panel; deletion-request review |
| `/projects` | `Projects` | `Screens/Dashboard/Projects.tsx` | All | Project cards with status tabs and search |
| `/projects/:id` | `ProjectDetail` | `Screens/Dashboard/ProjectDetail.tsx` | All | One project: progress, burn-down, up next, tasks by status, team |
| `/tasks` | `Tasks` | `Screens/Dashboard/Tasks.tsx` | All | Board (drag and drop) or list of every task you can see |
| `/kanban` | — | — | — | Redirects to `/tasks` (old link) |
| `/analytics` | `Analytics` | `Screens/Dashboard/Analytics.tsx` | `SUPER_ADMIN`, `CLIENT_ADMIN` | Analytics dashboard (stat cards, donuts, drill-down) |

---

## Sidebar Navigation

Defined in `Screens/Components/app-sidebar.tsx` (`NAV_BY_ROLE`).

| Role | Nav Items |
|------|-----------|
| `SUPER_ADMIN` | Dashboard, Users, Clients, Projects, Tasks |
| `CLIENT_ADMIN` | Dashboard, Clients, Projects, Tasks, Analytics |
| `USER` | Dashboard, Projects, Tasks |

The top bar (`site-header.tsx`) adds:
- Search, which opens the ⌘K palette.
- The theme toggle.
- The bell, which opens the notifications sheet; a dot shows unread notifications.

The avatar at the bottom of the sidebar opens the account menu.

---

## Screen Inventory

Forms and sheets open over the current page with `openForm(kind, data)`. They are not routes. Kinds and components are listed in `components/forms/form-host.tsx`.

### Dashboard (`/dashboard`)
- **AdminDashboard** (super and client admins):
  - Role-based quick actions and stat cards, and a 7d / 30d / 90d range remembered per browser.
  - Created vs resolved chart, upcoming deadlines, workload, project status (or progress for client admins), activity.
  - Super admin only: a "Needs a decision" strip for deletion requests and clients without an admin.
  - Opens: `task`, `task-view`, `project`, `user`, `client`, `decline-request`, `delete-client`.
- **MemberDashboard** (`USER`):
  - Your overdue / today / this-week tasks, your projects, your week, mini stats, activity.
  - Opens: `task-view`, `log-update`.
- Data: `useAppData()`, which loads projects, all tasks, users (admins) and clients (super admin) once.

### Users (`/users`, SUPER_ADMIN)
- Tabs: All, Super admins, Client admins, Users. Search by name or email. Status shown as Active / Locked / Invited, plus last seen.
- Row checkboxes (`useSelection`) open a bulk bar: Change role (`bulk-role`), Unlock (`bulk-unlock`), Remove (`bulk-remove`). You can't select yourself, and switching tabs clears the selection.
- Opens:
  - `user`: invite or create, and edit.
  - `export-users`: CSV / JSON with chosen columns.

### Clients (`/clients`, SUPER_ADMIN + CLIENT_ADMIN)
- **Super admin:**
  - Tabs: All, Needs attention, Delete requested.
  - Table and detail panel. Actions: edit, assign admin, approve or decline a deletion request, force delete.
  - Opens: `client`, `decline-request`, `delete-client`.
- **Client admin:**
  - Sees only their own client.
  - Edit, and "Request deletion" (an inline dialog that calls `confirmDeleteClient`).

### Projects (`/projects`) and Project detail (`/projects/:id`)
- **Projects:** cards with progress from tasks, status tabs, search. Opens `project` (create / edit).
- **Detail:**
  - Progress and a burn-down built from task `createdAt` / `resolvedAt`.
  - Open, overdue and resolved counts; up next; tasks by status; team.
  - Opens: `project`, `team`, `delete-project`, `task`, `task-view`.

### Tasks (`/tasks`)
- **Board:** four status columns (`@dnd-kit/core`). Admins can drag any task; a `USER` can drag only their own. Dropping a card calls `updateTaskStatus`.
- **List:** grouped by due date, with expandable rows showing sub-tasks.
- **Filters:** admins choose "All" or "Mine"; a `USER` sees only their own tasks.
- **Opens:**
  - `task`: create, admins only.
  - `task-view`: the side sheet with inline edits, status, sub-tasks and comments. Its sub-task quick add reads `!priority @person ^due` from the title.
  - `log-update`.

### Account (`/account`)
- `ProfileHeader` and `ProfileContent`, with Profile and Preferences tabs. Not yet restyled to the new design.
- Password change and profile edits are also available from the account menu (`account`).

### Analytics (`/analytics`)
- `AnalyticsDashboard`: stat cards, project-status and user-role donuts, client health, largest teams. Clicking through opens the filtered page. Not yet restyled.

---

## API → GraphQL Operation Map

Every call goes through `gql()` in `src/api/graphql.ts`, a single Axios instance that attaches the Bearer token. Subscriptions use `src/api/ws.ts` (`graphql-ws`). There is no Apollo Client.

| File | Function → Operation |
|---|---|
| `authApi.ts` | `loginUser` → `LoginMutation`, `registerUser` → `RegisterMutation`, `forgotPassword` → `ForgotPasswordMutation`, `resetPassword` → `ResetPasswordMutation` |
| `userApi.ts` | `getProfile` → `GetProfile`, `getUsers` → `GetUsers`, `updateProfile` → `UpdateProfile`, `deleteUser` → `DeleteUser`, `promoteToAdmin` → `PromoteToAdmin`, `createUser` → `CreateUser`, `updateUser` → `UpdateUser`, `changeUserRoles` → `ChangeUserRoles`, `unlockUsers` → `UnlockUsers`, `resendInvite` → `ResendInvite`, `deleteUsers` → `DeleteUsers`, `changePassword` → `ChangePassword` |
| `clientApi.ts` | `getClients` → `GetClients`, `getClient` → `GetClient`, `addClient` → `AddClient`, `updateClient` → `UpdateClient`, `confirmDeleteClient` → `ConfirmDeleteClient`, `deleteClientBySuperAdmin` → `DeleteClientBySuperAdmin`, `forceDeleteClient` → `ForceDeleteClient`, `assignAdmin` → `AssignAdmin`, `declineClientDeletion` → `DeclineClientDeletion` |
| `projectApi.ts` | `getProjects` → `GetProjects`, `addProject` → `CreateProject`, `updateProject` → `UpdateProject`, `deleteProject` → `DeleteProject`, `addUserToProject` → `AddUserToProject`, `removeUserFromProject` → `RemoveUserFromProject` |
| `taskApi.ts` | `getTasks` → `GetTasks`, `getAllTasks` → `GetAllTasks`, `createTask` → `CreateTask`, `updateTask` → `UpdateTask`, `updateTaskStatus` → `UpdateTaskStatus`, `deleteTask` → `DeleteTask` |
| `subTaskApi.ts` | `getSubTasks` → `GetSubTasks`, `createSubTask` → `CreateSubTask`, `updateSubTask` → `UpdateSubTask`, `updateSubTaskStatus` → `UpdateSubTaskStatus`, `deleteSubTask` → `DeleteSubTask` |
| `commentApi.ts` | `getTaskComments` → `GetTaskComments`, `addTaskComment` → `AddTaskComment`, `deleteComment` → `DeleteComment` |
| `notificationApi.ts` | `getNotifications` → `GetNotifications`, `markAsRead` → `MarkAsRead`, `markAllAsRead` → `MarkAllAsRead`, `markNotificationsRead` → `MarkNotificationsRead`, `deleteNotification` → `DeleteNotification`, `deleteAllNotifications` → `DeleteAllNotifications`, `subscribeToNotifications` → `OnNotificationCreated` (subscription) |
| `preferenceApi.ts` | `getPreference` → `GetPreference`, `updatePreference` → `UpdatePreference` |

The four public operation names must match the server's whitelist exactly (`LoginMutation`, `RegisterMutation`, `ForgotPasswordMutation`, `ResetPasswordMutation`).
