# Architecture

ComalPOS is a single Next.js application. There is no separate API service
and no native mobile app. The browser talks to Server Actions; Auth.js is
the only HTTP API (`app/api/auth`).

## Request flow

```
Browser
  → proxy.ts (Auth.js middleware)
  → app/auth.config.ts (session + role check)
  → page in app/(dashboard)/  or  Server Action in lib/actions/
  → Prisma (lib/prisma.ts, DATABASE_URL)
  → PostgreSQL
```

Unauthenticated requests go to `/login`. A logged-in user who hits a route
their role cannot access is redirected to `/pos`. The intercept file is
`proxy.ts` (Next.js 16; there is no `middleware.ts`) — see
[docs/middleware.md](docs/middleware.md). Roles and login are in
[docs/auth.md](docs/auth.md).

## Runtime pieces

- **Pages** — App Router under `app/(auth)/` (login) and `app/(dashboard)/`
  (the POS and back office).
- **Server Actions** — all business mutations and most reads live in
  `lib/actions/`. They require a JWT session.
- **Prisma** — PostgreSQL via `@prisma/adapter-pg`. Migrations use a
  different URL than the app. See [docs/database.md](docs/database.md).
- **Client state** — Zustand. Device-only settings persist in
  `localStorage` (`lib/device-settings.ts`). Sidebar submenu state is also
  client-side (`lib/store.ts`).
- **Nav** — desktop sidebar and mobile bottom sheet both derive visibility
  from `lib/permissions.ts`.

## Folder map

| Path | Role |
| --- | --- |
| `app/` | Routes, layouts, Auth.js route handler |
| `app/(dashboard)/` | Authenticated feature pages |
| `components/layout/` | Sidebar, mobile nav, topbar, jornada banner |
| `components/ui/` | shadcn / Radix primitives |
| `lib/actions/` | Server Actions (domain logic) |
| `lib/actions/schemas.ts` | Shared Zod schemas |
| `lib/auth.ts` | Credentials provider (ADMIN password, STAFF PIN) |
| `lib/permissions.ts` | Route ACL (Edge-safe) |
| `lib/prisma.ts` | Runtime Prisma client |
| `lib/pos-source.ts` | `sales.source_type` prefixes |
| `prisma/` | Schema, migrations, seed |
| `tests/integration/` | Vitest + database |
| `tests/e2e/` | Playwright |
| `proxy.ts` | Auth middleware matcher |

## Roles

Two roles, defined in `lib/auth-types.ts`:

- **ADMIN** — email + password; full back office (`/admin/*`).
- **STAFF** — username + 4-digit PIN; POS, expenses, and debtors.

Jornada open/close is ADMIN-only. Staff see a read-only banner when a shift
is closed (sales and expenses are blocked).

## Feature map

Module routes and Server Actions are listed in
[docs/modules.md](docs/modules.md). Statistics, reports, and the Optimiza
analysis pages are stubs or hidden BETA.
