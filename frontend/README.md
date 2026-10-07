# ProjoMan — Frontend

React 18 + TypeScript single-page app for ProjoMan. It talks to the GraphQL API in `../server` over HTTP (queries and mutations) and WebSocket (live notifications).

## Quick start

```bash
npm install
npm run dev        # http://localhost:4000
npm test           # Vitest, watch mode (npm run test:run for one run)
npm run build      # tsc + production build
npm run preview    # serve the production build
```

Needs the API running on port 8000 (see the root `README.md`). With Docker: `docker compose --profile dev up -d frontend`. After changing `package.json`, add `--build --renew-anon-volumes`.

## Environment

| Variable | Description |
|---|---|
| `VITE_API_URL` | GraphQL endpoint, e.g. `http://localhost:8000/graphql` |
| `VITE_WS_URL` | Optional WebSocket endpoint; defaults to `VITE_API_URL` with `http` → `ws` |

## What's inside

- **Screens:**
  - Admin and Member dashboards.
  - Users (super admin).
  - Clients.
  - Projects and project detail.
  - Tasks board (drag and drop) and list.
  - Analytics and Account.
- **Forms** open over any page through `openForm(kind)`. There's also a ⌘K command palette, and deletes can be undone for 5 seconds.
- **Notifications** arrive live over WebSocket.
- **Design system:** Tailwind with OKLCH tokens, light and dark themes, and hand-written SVG charts.

## More docs

- [`CLAUDE.md`](CLAUDE.md): conventions, hooks, API pattern, testing rules.
- [`STATUS.md`](STATUS.md): what's done and known issues.
- [`Routes.md`](Routes.md): every route, its guard and what it shows.
- [`../docs/FRONTEND.md`](../docs/FRONTEND.md): the long-form guide.
- [`../CHANGELOG.md`](../CHANGELOG.md): recent changes.
