# Frontend Status

**Version**: 0.0.0  
**Runtime**: React 18 + TypeScript 5  
**Last Updated**: 2026-10-06

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
| API layer | ✅ Complete | One `gql()` helper (`src/api/graphql.ts`) used by every `*Api.ts`; Bearer token via interceptor; GraphQL error messages surfaced from 401/429 replies too |
| WebSocket client | ✅ Complete | `src/api/ws.ts` (`graphql-ws`): lazy, token sent on connect, reconnects with back-off (not after a 4403 bad token), closed on logout |
| Reusable hooks | ✅ Complete | `src/hooks/`: `useAsyncAction`, `useLocalStorage`, `useSelection`, `useOutside`, `useSubscription`, `useNotifications`; `index.ts` also re-exports `useTheme`, `useForm`, `useForms`, `useAppData`, `useTaskActions` |
| Test suite | ✅ Complete | Vitest + Testing Library; 82 tests covering hooks, API helpers, notifications sheet/header, forms, Users selection, dashboard range, theme |
| TypeScript types | ✅ Complete | Interfaces for all domain models in `src/types/` |
| shadcn/ui component library | ✅ Complete | 22 primitive components in `src/components/ui/`, restyled to the design |
| Tailwind CSS | ✅ Complete | v3.4; OKLCH design tokens from the ProjoMan redesign (`src/index.css`, `tailwind.config.js`) |
| Design-system components | ✅ Complete | `src/components/pm/`, rebuilt from `ProjoMan Dashboard (standalone) (1).html` in Tailwind: PageHead, Panel, StatCard, StatusBadge, Avatar, Progress, EmptyState, Segmented, AnimatedTabs, CountUp, TaskRow, ProjectCard, SVG charts (AreaChart, Donut, Sparkline). shadcn `Button` restyled to the design |
| App shell (redesign) | ✅ Complete | Matches the design: 232px sidebar collapsing to a 64px icon rail, sliding nav pill, 56px blurred top bar with search field (opens ⌘K), theme toggle, bell with unread dot, page transitions |
| Users / Clients / Projects (redesign) | ✅ Complete | Users: role tabs, search, table with selection + bulk role / unlock / remove, CSV / JSON export, invite and edit forms. Clients: tabs, table + detail panel (approve or decline deletion, assign admin, force delete); client admins see their own client with Edit and Request deletion. Projects: grid/board, status tabs, cards; new `/projects/:id` detail page (progress, open/overdue/resolved from the project's tasks, up next, by status, team) |
| Dashboard (redesign) | ✅ Complete | Admin (super/client) and member dashboards built to the design from real data (`allTasks` for task panels: overdue, created vs resolved, deadlines, workload, my week, activity). 7d/30d/90d switch, remembered per browser |
| React Query | ⚠️ Auth screens only | `useMutation` on login/register/forgot/reset; everything else uses Redux thunks |
| Zustand | ⚠️ Installed, unused | Installed (`zustand@4.5.2`) but not wired to any state |
| Apollo Client | ❌ Not used | By design: one `gql()` helper (Axios) for HTTP and `graphql-ws` for subscriptions — no Apollo/Urql |

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
| Dashboard overview | ✅ Complete | Admin and member dashboards (see Dashboard redesign above) |
| Profile view & edit | ✅ Complete | name, phone, dob, gender |
| User Preferences | ✅ Complete | Theme (LIGHT/DARK) + Language (EN/JA/KO) |
| Users list (SUPER_ADMIN) | ✅ Complete | Search, role tabs, status (Active / Locked / Invited), last seen; see User administration |
| Client management | ✅ Complete | CRUD, assign admin, deletion request → approve / decline with message, force delete (typed confirmation) |
| Project management | ✅ Complete | CRUD, team member add/remove, status filter |
| Task management | ✅ Complete | Create (admins), task sheet with inline edits, status, priority, deadline, assignment (clearable) |
| SubTask management | ✅ Complete | In the task sheet: quick add (`!priority @person ^due`), status, delete |
| Tasks board | ✅ Complete | `/tasks`: board with `@dnd-kit` drag and drop between statuses, plus list view with expandable rows; `/kanban` redirects here |
| Forms system | ✅ Complete | `openForm(kind)` host; task / project / team / user / bulk role / unlock / remove / export / client / decline-request / account forms; ⌘K palette; validation on blur; delayed delete with 5s Undo |
| User administration (SUPER_ADMIN) | ✅ Complete | Invite or create with password, edit, bulk role change, unlock, resend invite, bulk remove, CSV/JSON export |
| Notifications (header bell) | ✅ Complete | Side sheet with All / Unread; click marks one read, "Mark all read" is one request; delete, clear all; optimistic with rollback |
| Comments on tasks | ✅ Complete | In the task sheet: list, add, delete |
| Comments on subtasks | ❌ Not implemented | Server API ready (`subTaskComments`, `addSubTaskComment`, `updateComment`) |
| Real-time notifications (WebSocket) | ✅ Complete | `notificationCreated` subscription; new ones appear instantly with a toast ("Open"); 5-minute safety poll and refresh on reconnect |
| Analytics dashboard | ✅ Complete | Stat cards + donut charts + multi-row charts + drilldown |
| Dark mode toggle | ✅ Complete | Header toggle + ⌘K; `useTheme` syncs Preference → `.dark` on `<html>`, cached in `localStorage` (no flash on reload). Previously saved but never applied |
| Responsive / mobile layout | ⚠️ Partial | `useIsMobile` hook exists; some layouts not fully adapted |
| Form validation | ✅ Complete (signed-in forms) | `useForm` rules with validation on blur and on submit, shake on invalid; auth screens still validate manually |
| Error handling (toast/alerts) | ⚠️ Partial | Shared toaster and `FormError`; server messages surfaced by `gql()`; no global error boundary |
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
│   ├── Dashboard/                 # Account, Analytics, Clients, Dashboard (dashboard/: Admin, Member), Projects, ProjectDetail, Tasks, Users
│   ├── Components/                # AppLayout, AppSidebar, SiteHeader, AnalyticsDashboard, ProfileHeader, ProfileContent, NavMain, NavUser, ...
│   ├── RouteHandler/              # RouteNavigator.tsx — all route definitions + guards
│   └── ui-Components/             # UserAuthLoginForm, UserAuthRegisterForm
│
├── api/                           # gql() helper, ws.ts WebSocket client, one API file per domain
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
├── hooks/                         # Reusable hooks (useAsyncAction, useLocalStorage, useSelection, useNotifications, …)
├── test/setup.ts                  # Vitest setup
│
└── components/
    ├── ui/                        # shadcn/ui primitive components
    ├── pm/                        # Design-system building blocks and SVG charts
    ├── forms/                     # Form system, sheets, toaster, ⌘K palette
    ├── hooks/                     # useTheme, useIsMobile, useInputFields, useInputMap
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
| `tasks` | `{ loading, loaded, tasks[], selectedProjectId, error }` | Every task the user can see (`allTasks`) |
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
| State (server) | react-query *(auth screens only)* | 3.39.3 |
| WebSocket | graphql-ws | 6.x |
| Drag and drop | @dnd-kit/core | 6.3.1 |
| Tests | Vitest + Testing Library + jsdom | 0.34 / 14 / 22 |
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
| `VITE_API_URL` | ✅ | GraphQL endpoint, e.g. `http://localhost:8000/graphql` |
| `VITE_WS_URL` | — | WebSocket endpoint for subscriptions; defaults to `VITE_API_URL` with `http` → `ws` |

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

# Tests (watch / single run)
npm test
npm run test:run

# Lint
npm run lint
```

---

## Known Issues / Limitations

Same severity scale as `server/STATUS.md`:
- **High:** security or data isolation.
- **Medium:** correctness, user impact or build health.
- **Low:** polish.

| # | Severity | Area | Issue and impact | Recommended fix |
|---|---|---|---|---|
| F-1 | Medium | Security | **The JWT is stored in `localStorage`.** Any XSS would expose the token. It is mitigated by React's escaping and the absence of `dangerouslySetInnerHTML`, but not eliminated. | Move to an `HttpOnly` cookie set by the API, or a short-lived in-memory token with refresh. |
| F-2 | Medium | Build | **`npm run build` fails on existing type errors.** `tsc` reports 35 errors in older files (`useInputFields`, `useInputMap`, `ui/dialog`, `user-auth-form`, legacy Redux files); `vite build` alone succeeds. New code adds none. | Fix or delete the legacy files (most go away with F-5). Then make `tsc` a CI gate. |
| F-3 | Medium | Testing | **Coverage is partial.** Vitest covers hooks, API helpers, notifications, five forms, Users selection and the dashboard range. Most screens, the Tasks board drag-and-drop and the task sheet have no tests. | Add tests test-first as those areas change; add Playwright E2E for sign-in → assign → live notification. |
| F-4 | Low | Design | **Account, Analytics and the auth screens aren't restyled.** They still use hard-coded palette classes and hex colours that ignore tokens and dark mode. | Rebuild them with `components/pm/` and tokens. |
| F-5 | Low | Forms | **Auth screens use the old form helpers** (`useInputFields` / `useInputMap`, React Query `useMutation`); signed-in forms use `useForm` + `useAsyncAction`. | Port the auth screens to `form-kit`; then remove the legacy hooks and `react-query`. |
| F-6 | Low | Auth UX | **Invite links aren't distinguished.** The server adds `&invite=1` to invite links, but `ResetPassword` shows the same "reset" wording. | Read `invite=1` and show "Set your password" copy. |
| F-7 | Low | Live data | **No live task updates.** Only notifications arrive over the WebSocket; task and project lists refresh on load or after your own changes. | Add a server task subscription; consume it with `useSubscription`. |
| F-8 | Low | Resilience | **No global error boundary.** Toasts handle API errors, but an uncaught render error blanks the screen. | Add an error boundary around `AppLayout`'s outlet. |
| F-9 | Low | Mobile | **Partial responsiveness.** The sidebar collapses off-canvas, but some tables and multi-column layouts aren't adapted for small screens. | Card layouts for tables under ~640 px. |
| F-10 | Low | Dependencies | **`zustand` is installed but unused.** | Remove it. |
