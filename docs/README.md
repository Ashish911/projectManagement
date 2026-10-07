# ProjoMan Documentation

Where to find what, who each document is for, and which one wins when two disagree.

## Document map

| Document | Audience | Covers | Depth |
|---|---|---|---|
| [`../README.md`](../README.md) | Everyone | What ProjoMan is, setup, role model, feature status | Entry point |
| [`OVERVIEW.md`](OVERVIEW.md) | Product, stakeholders, new joiners | What the system does and why, in plain language | Conceptual |
| [`BACKEND.md`](BACKEND.md) | Backend engineers | Architecture, every API operation with rules and errors, data models, notifications, testing, logging, metrics | Reference |
| [`FRONTEND.md`](FRONTEND.md) | Frontend engineers | App structure, screens, components, state, API layer, hooks, theming, testing | Reference |
| [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) | Senior engineers, reviewers | Capacity, data model, caching, async processing, failure modes, ADRs | Design rationale |
| [`AWS_ARCHITECTURE.md`](AWS_ARCHITECTURE.md) | Platform / DevOps | Target production deployment on AWS (proposed, not yet provisioned) | Infrastructure |
| [`../server/Routes.md`](../server/Routes.md) | API consumers | Every GraphQL operation: arguments, return type, who may call it | Quick reference |
| [`../frontend/Routes.md`](../frontend/Routes.md) | Frontend engineers | Every route, its guard, what each screen shows and opens | Quick reference |
| [`../server/STATUS.md`](../server/STATUS.md) · [`../frontend/STATUS.md`](../frontend/STATUS.md) | Everyone | What's done, what's partial, known issues by severity | Status |
| [`../CHANGELOG.md`](../CHANGELOG.md) | Everyone | What changed, upgrade notes | History |
| [`../CLAUDE.md`](../CLAUDE.md) · [`../frontend/CLAUDE.md`](../frontend/CLAUDE.md) | Contributors (human or AI) | Conventions and rules for changing the code | Working agreement |

## Source of truth

When two places disagree, trust them in this order:

1. **The code.** For the API that means `server/graphql/schema.js` and `services/`; for the UI, `frontend/src/App.tsx` and `src/api/`.
2. **The short references:** `server/Routes.md` and `frontend/Routes.md`. They are checked against the schema and routes on every documentation pass.
3. **The long-form guides:** `BACKEND.md`, `FRONTEND.md`, `SYSTEM_DESIGN.md`.
4. **`OVERVIEW.md`**, which simplifies on purpose.

If you find a disagreement, fix the document lower in the list.

## Keeping docs current

A change isn't done until the docs that describe it are updated in the same change:

| You changed… | Update |
|---|---|
| A GraphQL operation (new, renamed, new argument or rule) | `server/Routes.md`, `BACKEND.md` §11–13, the README API tables, `CHANGELOG.md` |
| A role or permission rule | Role tables in the README and `CLAUDE.md`, `BACKEND.md` §6 |
| A route or screen | `frontend/Routes.md`, `FRONTEND.md` §6–7 |
| A GraphQL string or type in the frontend | `FRONTEND.md` §11–13 (copied from source) |
| Infrastructure (containers, env vars, Redis usage) | README setup, `BACKEND.md` §4 and §18, `AWS_ARCHITECTURE.md` |
| Something that's now done, or a new limitation | The relevant `STATUS.md` |

Write the docs for the reader who arrives with a question:
- Lead with what the thing does and who can use it, then the details.
- State limitations plainly in the STATUS known-issues tables rather than hiding them in prose.

_Last reviewed: 2026-10-06._
