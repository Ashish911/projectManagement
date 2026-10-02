# Frontend Status

**Version**: 0.0.0  
**Runtime**: React 18 + TypeScript 5  
**Last Updated**: 2026-09-28

---

## Implementation Status

### Core Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| Vite build + dev server | ✅ Complete | Dev on port 4000 |
| React Router v6 | ✅ Complete | BrowserRouter with public + protected route guards |
| Redux Toolkit store | ✅ Complete | 9 slices; JWT pre-loaded from localStorage on startup |
| Redux Thunk middleware | ✅ Complete | All async API calls via thunks |
| Global logout | ✅ Complete | Single `LOGOUT` action resets all slices |
| Axios API layer | ✅ Complete | Raw GraphQL POST; Bearer token injected via request interceptor |
| TypeScript types | ✅ Complete | Interfaces for all domain models in `src/types/` |
| shadcn/ui component library | ✅ Complete | 19 primitive components available |
| Tailwind CSS | ✅ Complete | v3 with custom config |
| React Query | ⚠️ Installed, unused | Installed (`react-query@3.39.3`) but all data fetching uses Redux Thunks + Axios instead |
| Zustand | ⚠️ Installed, unused | Installed (`zustand@4.5.2`) but not wired to any state |
| Apollo Client | ❌ Not used | Server is GraphQL but client uses raw Axios POST — no Apollo/Urql |

---

### Features

| Feature | Status | Notes |
|---------|--------|-------|
| Login | ✅ Complete | JWT stored in Redux + localStorage |
| Register | ✅ Complete | Full field set: name, email, phone, dob, gender, password |
| Forgot Password | ✅ Complete | Server emails a reset link; screen shows a "check your email" message |
| Reset Password | ✅ Complete | Token read from the emailed `?token=` link (or entered manually) + new password; redirects on success |
| Protected routes | ✅ Complete | Token + role validation; redirects on failure |
| Public routes | ✅ Complete | Auto-redirects to `/dashboard` when already logged in |
| Dashboard overview | ✅ Complete | Stat cards, donut charts, drilldown navigation |
| Profile view & edit | ✅ Complete | name, phone, dob, gender |
| User Preferences | ✅ Complete | Theme (LIGHT/DARK) + Language (EN/JA/KO) |
| Users list (SUPER_ADMIN) | ✅ Complete | Search, role filter, view details, promote, delete |
| Client management | ✅ Complete | CRUD, assign admin, soft-delete request, force delete |
| Project management | ✅ Complete | CRUD, team member add/remove, status filter |
| Task management | ✅ Complete | CRUD, status transitions, priority, deadline, assignment |
| SubTask management | ✅ Complete | CRUD, status transitions, priority, deadline, assignment |
| Kanban board | ✅ Complete | 4-column view, status-button updates |
| Kanban drag-and-drop | ❌ Not implemented | Status changed via buttons only |
| Notifications (header bell) | ✅ Complete | Popover, 30s polling, mark read, delete |
| Real-time notifications (WebSocket) | ❌ Not implemented | Server has subscription ready; frontend uses polling only |
| Analytics dashboard | ✅ Complete | Stat cards + donut charts + multi-row charts + drilldown |
| Dark mode toggle | ✅ Complete | Via Tailwind class strategy, stored in Preference |
| Responsive / mobile layout | ⚠️ Partial | `useIsMobile` hook exists; some layouts not fully adapted |
| Form validation | ⚠️ Partial | Password-match check on ResetPassword; no library-level validation (no Zod/RHF) |
| Error handling (toast/alerts) | ⚠️ Partial | Errors shown inline in some screens; no global error boundary or toast system |
| Loading skeletons | ⚠️ Partial | Spinner component exists; not consistently applied across all screens |

---

## Project Structure

```
frontend/src/
├── App.tsx                        # Root — QueryClientProvider, Redux Provider, BrowserRouter
├── main.tsx                       # ReactDOM.createRoot entry point
│
├── Screens/
│   ├── Auth/                      # Login, Register, ForgotPassword, ResetPassword
│   ├── Dashboard/                 # Account, Analytics, Clients, Dashboard, Kanban, Projects, Tasks, Users
│   ├── Components/                # AppLayout, AppSidebar, SiteHeader, AnalyticsDashboard, ProfileHeader, ProfileContent, NavMain, NavUser, ...
│   ├── RouteHandler/              # RouteNavigator.tsx — all route definitions + guards
│   └── ui-Components/             # UserAuthLoginForm, UserAuthRegisterForm
│
├── api/                           # Axios API functions (one file per domain)
├── queries/                       # GraphQL query strings
├── mutations/                     # GraphQL mutation strings
│
├── redux/
│   ├── store/store.ts             # configureStore with JWT pre-load + LOGOUT reset
│   ├── actions/                   # Thunk action creators (one file per domain)
│   ├── reducers/                  # Slice reducers (one file per domain)
│   └── constants/                 # Action type string constants (one file per domain)
│
├── types/                         # TypeScript interfaces for all domain models
│
└── components/
    ├── ui/                        # shadcn/ui primitive components
    ├── hooks/                     # useIsMobile, useInputFields, useInputMap
    └── lib/utils.ts               # cn() Tailwind class merge utility
```

---

## Redux Store — Slice Summary

| Slice Key | State Shape | Purpose |
|-----------|-------------|---------|
| `login` | `{ loading, error, token }` | Auth token from login |
| `register` | `{ loading, success, error }` | Registration state |
| `profile` | `{ loading, profile }` | Current user's profile |
| `preference` | `{ loading, saving, preference, error }` | Theme + language settings |
| `usersList` | `{ loading, users[], error, roleFilter }` | All users (SUPER_ADMIN view) |
| `clients` | `{ loading, clients[], error, activeFilter }` | Client list + active UI filter |
| `projects` | `{ loading, projects[], error, statusFilter }` | Project list + status filter |
| `tasks` | `{ loading, tasks[], selectedProjectId, error }` | Tasks for selected project |
| `subTasks` | `{ loading, subTasks[], selectedTaskId, error }` | SubTasks for selected task |

Token persistence: `store.ts` reads `localStorage.token` on init and validates expiry before hydrating the `login` slice.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 18.2.0 |
| Language | TypeScript | 5.0.2 |
| Build Tool | Vite | 4.4.5 |
| Routing | React Router | 6.15.0 |
| State (global) | Redux Toolkit + redux-thunk | 2.9.0 / 3.1.0 |
| State (server) | react-query *(installed, unused)* | 3.39.3 |
| HTTP Client | axios | 1.5.0 |
| UI Components | shadcn/ui + Radix UI | — |
| Icons | lucide-react + @tabler/icons-react | 0.268.0 / 3.35.0 |
| Styling | Tailwind CSS | 3.3.3 |
| Date Utilities | date-fns + react-day-picker | 4.1.0 / 9.11.1 |
| State *(unused)* | Zustand | 4.5.2 |

---

## Environment Variables

Set in `.env` (or `.env.local`) at the frontend root.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Base URL for the GraphQL API — e.g. `http://localhost:8000` |

All variables must be prefixed `VITE_` to be exposed by Vite at build time.

---

## Scripts

```bash
# Install dependencies
npm install

# Start dev server (port 4000)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview

# Lint
npm run lint
```

---

## Known Issues / Limitations

- **No real-time notifications**: The server exposes a `notificationCreated` WebSocket subscription but the frontend polls the REST/GraphQL endpoint every 30 seconds instead. Connecting the WebSocket would give instant delivery.
- **No drag-and-drop on Kanban**: Status changes are made via buttons in a detail sheet. A library like `@dnd-kit/core` would need to be added.
- **`react-query` and `zustand` installed but unused**: Both are in `package.json` but all data fetching is done via Redux Thunks + Axios. Either adopt them or remove to reduce bundle size.
- **No form validation library**: Inputs are validated manually (only `ResetPassword` has a match check). Adding React Hook Form + Zod would make form handling consistent and safer.
- **No global error boundary or toast system**: API errors are handled locally per screen with varying patterns. A centralised toast (e.g., Sonner/shadcn toast) would give a consistent UX.
- **Partial mobile responsiveness**: `useIsMobile()` hook exists and the sidebar handles mobile with an offcanvas, but some data tables and multi-column layouts are not fully adapted for small screens.
- **No test suite**: There are no frontend unit or integration tests (no Jest, Vitest, or Playwright config found).
