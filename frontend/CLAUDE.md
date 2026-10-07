# CLAUDE.md — Frontend

This file gives Claude Code context about the frontend app. Keep it updated as features land.

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 4 (dev port: **4000**) |
| Routing | React Router 6 |
| UI | shadcn/ui + Radix UI primitives, plus the design-system pieces in `src/components/pm/` |
| Styling | Tailwind CSS 3.4, OKLCH design tokens (CSS variables), dark mode via `class` |
| Motion / charts | `motion` (`motion/react`) for sliding pills and page transitions; charts are small hand-written SVG components in `src/components/pm/charts/` (no chart library) |
| Drag and drop | `@dnd-kit/core` (Tasks board) |
| Fonts | Geist + Geist Mono (`@fontsource-variable/*`) |
| State | Redux + Redux Thunk (session, profile, and the users / clients / projects / tasks lists) |
| API | Axios via one `gql()` helper → raw GraphQL strings → `VITE_API_URL` |
| Live updates | `graphql-ws` client (`src/api/ws.ts`) for GraphQL subscriptions |
| Tests | Vitest 0.34 + Testing Library (jsdom) |
| Icons | Tabler Icons + Lucide React |

## Commands

```bash
npm run dev        # Dev server (port 4000)
npm run build      # tsc + production build
npm run preview    # Preview production build
npm test           # Vitest, watch mode
npm run test:run   # Vitest, single run
npx vitest run src/hooks/use-selection.test.ts   # One file
```

`tsc` has a baseline of 35 errors in older files (`useInputFields`, `useInputMap`, `ui/dialog`, `user-auth-form`, legacy redux files). Don't add to it.

In Docker, the container's `node_modules` is an anonymous volume. After changing `package.json`, run `docker compose --profile dev up -d --build --renew-anon-volumes frontend`.

## Directory Structure

```
src/
├── api/              # graphql.ts (gql helper), ws.ts (WebSocket client), one *Api.ts per entity
├── queries/          # Raw GraphQL query + subscription strings
├── mutations/        # Raw GraphQL mutation strings
├── types/            # TypeScript interfaces for API payloads
├── hooks/            # Reusable hooks (see below); index.ts re-exports all of them
├── redux/            # store, reducers, thunk actions, constants
├── Screens/
│   ├── Auth/         # Login, Register, ForgotPassword, ResetPassword
│   ├── Dashboard/    # Dashboard (dashboard/: Admin + Member), Users, Clients, Projects, ProjectDetail, Tasks, Analytics, Account
│   ├── Components/   # AppLayout, sidebar, site-header, nav
│   └── RouteHandler/ # ProtectedRoute (optional `roles`) & PublicRoute
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── pm/           # Design-system building blocks (PageHead, Panel, StatCard, TaskRow, charts…)
│   ├── forms/        # Form system: form-kit, FormsProvider/openForm host, every form/sheet, toaster
│   └── hooks/        # useTheme, useIsMobile, legacy useInputFields/useInputMap (auth screens)
├── test/setup.ts     # Vitest setup: jest-dom, observer stubs, cleanup
├── App.tsx           # Routes
└── main.tsx          # Entry point
```

## Routes

| Path | Screen | Roles |
|---|---|---|
| `/`, `/register`, `/forgot-password`, `/reset-password` | Auth screens | Public only |
| `/dashboard` | Admin or Member dashboard (by role) | Any |
| `/account` | Account | Any |
| `/users` | Users | SUPER_ADMIN |
| `/clients` | Clients | SUPER_ADMIN, CLIENT_ADMIN |
| `/projects`, `/projects/:id` | Projects, ProjectDetail | Any |
| `/tasks` | Tasks (board with drag and drop, and list) | Any |
| `/analytics` | Analytics | SUPER_ADMIN, CLIENT_ADMIN |
| `/kanban` | Redirects to `/tasks` | — |

Signed-in routes are children of one `AppLayout` route (sidebar, header, `PageTransition`, `FormsProvider`).

## Auth & Token Flow

1. Login/Register → JWT → Redux + `localStorage['token']`.
2. On startup the store drops an expired token.
3. `gql()` attaches `Authorization: Bearer <token>`; the WebSocket client sends it as `connectionParams.authorization` when it connects.
4. `logout()` removes the token and calls `closeSocket()`, so the next user connects with their own token.

## API Pattern

All HTTP calls go through `gql<T>(query, variables)` in `src/api/graphql.ts`. Don't create new Axios instances. It throws the first GraphQL error's message, including from 401/429 replies.

```ts
export const getTasks = async (projectId: string): Promise<Task[]> =>
    (await gql<{ tasks: Task[] }>(GET_TASKS, { projectId })).tasks;
```

Subscriptions go through `subscribe(query, onData)` in `src/api/ws.ts`, or `useSubscription` in components. The client is lazy: the socket opens with the first subscription. It reconnects with back-off, except after a 4403 (bad token), and calls `onReconnect` listeners after a reconnect.

## Notifications

`src/hooks/use-notifications.ts` is one module-level store shared by the header bell and the notifications sheet.
- The first subscriber loads the list once, then subscribes to `notificationCreated`.
- Pushed notifications are prepended (duplicates ignored), and the header shows a toast with an "Open" action.
- There is a 5-minute safety poll, plus a refresh after the socket reconnects.
- **Marking read:**
  - Clicking an unread notification calls `markAsRead(id)`.
  - "Mark all read" is one `markAllAsRead` request.
  - Opening the sheet marks nothing.
  - Both update optimistically and roll back on error.
- **The store's subscribe function must stay a stable module-level function.** An inline function passed to `useSyncExternalStore` re-subscribes on every render; it once caused a request loop. `use-notifications.test.tsx` guards this.

## Hooks (`src/hooks/`)

| Hook | Use it for |
|---|---|
| `useAsyncAction()` | `{ run, busy, error }` for form saves: ignores re-entry (⌘↵ + click), keeps the error message. Not for `task-sheet.tsx`, which runs several saves at once on purpose |
| `useLocalStorage(key, initial, { raw?, isValid? })` | Remembered UI state. `raw` stores plain strings (needed for `pm-theme`, which `index.html` reads) |
| `useSelection(ids)` | Table checkbox selection; ids that leave the list drop out |
| `useOutside(ref, fn, active)` | Close popovers on an outside press |
| `useSubscription(query, onData, { variables?, enabled? })` | Keep a GraphQL subscription open while mounted |
| `useNotifications()` / `onNewNotification()` | The live notification store |

Also re-exported from `@/hooks`: `useTheme`, `useIsMobile`, `useForm`, `useForms`, `useAppData`, `useTaskActions`.

## Forms

- Any screen opens a form with `useForms()` → `openForm(kind, data)` (kinds in `forms-context.ts`, registry in `form-host.tsx`).
- `form-kit.tsx` provides `useForm`, `FormModal` (Esc, ⌘↵, shake on invalid), `Field`, `SubmitButton`, etc.
- Deletes go through `scheduleDelete` (5s Undo toast) in `toaster.tsx`.

## Testing

**Test first.** Write the test, run it and see it fail for the expected reason, then implement. For existing code without tests, add the test and prove it can fail (temporarily break the code, see red, restore).

- Tests sit next to the code as `*.test.ts(x)` and use Vitest globals (`describe`, `it`, `vi`).
- Mock at the API boundary (`@/api/*Api`, `@/api/ws`) with `vi.mock`, and mock `react-redux` with a fake state.
- For module-level stores, `vi.resetModules()` and import dynamically per test. Then import anything that shares a module instance (e.g. `FormsContext`) dynamically too.
- Test names use `🟢` for happy paths and `🔴` for failure/edge cases, as on the server.

## Key Conventions

- **Path alias:** `@/` → `./src/`.
- **Class merging:** always use `cn()` from `@/lib/utils`.
- **Design system:** use tokens (`bg-card`, `bg-surface-2`, `text-muted-foreground`, `text-subtle-foreground`, `border-strong`, `chart-1..4`) and `src/components/pm/`, not raw palette colours. Status/priority/role pills go through `StatusBadge`; ad-hoc tones use `.tone-<hue> .tone-bg .tone-fg`. Wrap figures in `.num`.
- **Design reference:** `ProjoMan Dashboard (standalone) (1).html` in the repo root.
- **GraphQL strings** live in `src/queries/` and `src/mutations/`; **types** in `src/types/`.
- **GraphQL enums:** send the value as-is (`"IN_PROGRESS"`, `"URGENT"`); only `Gender` uses `M`/`F`/`O`.
- `react-query` is used only by the auth screens (`useMutation` for login, register, forgot/reset password); signed-in screens use Redux thunks and `useAsyncAction`. `zustand` is installed but unused. Don't introduce either elsewhere without discussion.
