# Technical notes

Conventions for changing this codebase. For the system shape, read
[ARCHITECTURE.md](ARCHITECTURE.md) first.

## Adding a feature

Do this in order. Skip a step if it does not apply.

1. **Schema** — add or change models in `prisma/schema.prisma`, then
   `npx prisma migrate dev`.
2. **Zod** — put shared shapes in `lib/actions/schemas.ts`. Keep form and
   action validation on the same schema when you can.
3. **Server Action** — new file under `lib/actions/`. Mark it
   `"use server"`. Call `auth()` and reject missing sessions. Do not add a
   REST route for business logic.
4. **Page** — `app/(dashboard)/.../page.tsx`. Admin-only screens go under
   `app/(dashboard)/admin/`.
5. **Nav** — add the href to `components/layout/sidebar.tsx` and
   `components/layout/mobile-nav.tsx`.
6. **ACL** — if the path is new and not already covered by `/admin`, add a
   rule in `lib/permissions.ts`. That module is bundled into middleware:
   **no Prisma, no Node APIs**.
7. **Tests** — a Vitest spec for the action, and a Playwright spec if the
   UI flow matters. See [docs/testing.md](docs/testing.md).

## Server Actions

- Every mutating action must check the session. Attribution (who placed a
  sale, who registered an expense) comes from the session, not from the
  client body.
- Return structured errors the UI already understands (for example
  `NO_OPEN_JORNADA`). Do not throw raw Prisma errors to the client.
- Revalidate the paths the UI reads after a write.

## Settings

Two stores, on purpose:

- **Business** — `setting` table, `lib/actions/settings.ts`. Shared by every
  terminal. Today the only key is `CLABE` (18-digit transfer account). Add a
  new key without a migration.
- **Device** — `lib/device-settings.ts` (Zustand + `localStorage`). Terminal
  name and anything that is per-browser. Never write these to the server.

## POS accounts

`sales.source_type` prefixes are defined only in `lib/pos-source.ts`:

| Prefix | Meaning |
| --- | --- |
| `MESA_<n>` | Table n |
| `CL- <name>` | Registered customer |
| `VL-<n>` | Open walk-in ticket |
| `VENTA_LIBRE` | Settled walk-in sale |

Open accounts stay `UNPAID` until **Cerrar cuenta**. Walk-in tickets become
`VENTA_LIBRE` when paid so the ticket number can be reused. Details:
[docs/modules.md](docs/modules.md).

## UI

- React 19, Tailwind 4, shadcn/Radix (`components/ui/`).
- Desktop sidebar is `lg:` and up; mobile uses the bottom sheet.
- Copy in the product UI stays Spanish.

## What not to do

- Do not introduce a REST API for domain operations.
- Do not import Prisma into `lib/permissions.ts` or `app/auth.config.ts`.
- Do not use the transaction pooler URL for migrations, or the session URL
  as the serverless runtime URL. See [docs/database.md](docs/database.md).
- Do not treat Statistics, Reports, or Optimiza as implemented features.
