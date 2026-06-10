# CLAUDE.md — Frontend

This file gives Claude Code context about the frontend app. Keep it updated as features land.

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 4 (dev port: **4000**) |
| Routing | React Router 6 |
| UI | shadcn/ui + Radix UI primitives |
| Styling | Tailwind CSS 3 (dark mode via `class`, CSS variables) |
| State | Redux Toolkit + Redux Thunk (auth, profile) |
| Server state | React Query 3 (`useMutation` in forms) |
| API | Axios → raw GraphQL strings → `http://localhost:8000/graphql` |
| Icons | Tabler Icons + Lucide React |

## Commands

```bash
# Dev server (port 4000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Directory Structure

```
src/
├── api/              # Axios GraphQL callers (authApi.ts, userApi.ts)
├── queries/          # Raw GraphQL query strings
├── mutations/        # Raw GraphQL mutation strings
├── types/            # TypeScript interfaces for API payloads
├── redux/
│   ├── store/        # Redux store (JWT validated on startup)
│   ├── reducers/     # authLoginReducer, authRegisterReducer, profileReducer
│   ├── actions/      # Thunk actions (fetchProfile, logout)
│   └── constants/    # Action type constants
├── Screens/
│   ├── Auth/         # Login, Register, ForgotPassword, ResetPassword
│   ├── Dashboard/    # Dashboard, Account
│   ├── Components/   # Sidebar, header, nav, section cards, profile UI
│   ├── ui-Components/# Shared form components
│   └── RouteHandler/ # ProtectedRoute & PublicRoute HOCs
├── components/
│   ├── ui/           # 19 shadcn/ui components
│   ├── hooks/        # use-mobile.tsx
│   └── lib/          # cn() utility
├── App.tsx           # Root with Router + Redux + QueryClient providers
└── main.tsx          # Entry point
```

## Routes

| Path | Component | Guard |
|---|---|---|
| `/` | `Login.tsx` | PublicRoute (redirects to `/dashboard` if authed) |
| `/register` | `Register.tsx` | PublicRoute |
| `/dashboard` | `Dashboard.tsx` | ProtectedRoute |
| `/account` | `Account.tsx` | ProtectedRoute |

**Not yet routed:** Tasks, Analytics, Projects, Team (menu items exist in sidebar).

## Auth & Token Flow

1. Login/Register → JWT returned from GraphQL → stored in Redux + `localStorage['token']`
2. On app startup, store validates JWT expiry — removes invalid tokens automatically
3. `ProtectedRoute` checks `state.login.token`; `PublicRoute` redirects away if token exists
4. Axios interceptor in `userApi.ts` attaches `Authorization: Bearer <token>` header

## API Pattern

No Apollo/Urql — plain Axios POST with raw GraphQL strings:

```ts
api.post("", { query: MUTATION_STRING, variables: { ...vars } })
```

**Implemented operations:**
- `LOGIN` mutation — email + password → token
- `REGISTER` mutation — name, email, number, dob, password, gender → name
- `PROFILE` query — returns name, email, number, dob, gender, role

## Current Feature Status

| Feature | Status |
|---|---|
| Login | Done |
| Register | Done |
| JWT auth + protected routes | Done |
| User profile (view) | Done |
| User profile (edit) | UI built, wire-up TBD |
| Forgot / Reset password | Pages exist, not implemented |
| Dashboard stats cards | UI built, static data |
| Tasks page | Not started |
| Projects page | Not started |
| Analytics page | Not started |
| Team page | Not started |
| Dark mode | Supported via Tailwind `class` strategy |

## Key Conventions

- **Path alias:** `@/` → `./src/` (configured in Vite + tsconfig)
- **Class merging:** always use `cn()` from `@/lib/utils` — not raw `clsx` or `twMerge`
- **Component styling:** use CVA (class-variance-authority) for variants
- **State split:** Redux for auth/user session; React Query for all other server mutations/queries going forward
- **GraphQL strings:** live in `src/queries/` (queries) and `src/mutations/` (mutations) — keep them there, not inline in components
- **Types:** all API response shapes go in `src/types/`
- **No Zustand yet** — it's installed but unused; don't introduce it without discussion
