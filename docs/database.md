# Database

PostgreSQL via Prisma 7 (`@prisma/adapter-pg`). The generated client is
written to `app/generated/prisma` (gitignored). Schema:
[`prisma/schema.prisma`](../prisma/schema.prisma).

## Runtime vs migrations

The app is deployed serverless on Vercel, so it needs **two** connection
strings. They are read independently.

- **`DATABASE_URL`** — runtime, used by [`lib/prisma.ts`](../lib/prisma.ts).
  On a pooled host use the **transaction pooler** (Supabase: port `6543`,
  `?sslmode=require`). The adapter uses a small pool per instance (`max: 4`)
  so the POS page can run parallel queries.
- **`DIRECT_URL`** — Prisma CLI only (`migrate deploy`, `db push`), set in
  [`prisma.config.ts`](../prisma.config.ts). Migrations need a real session
  (DDL and advisory locks). On Supabase use the **Session pooler** on port
  `5432`. The true Direct connection is IPv6-only and unreachable from
  Vercel’s IPv4 build. Locally this falls back to `DATABASE_URL`.

`npm run build` runs `prisma migrate deploy && next build`, so both
variables must be set in the deployment environment.

Using the transaction pooler (`6543`) for migrations breaks them. Using a
session connection for the runtime exhausts the client limit. Keep each URL
to its role.

## Settings storage

- **Business settings** — `setting` key/value table
  ([`lib/actions/settings.ts`](../lib/actions/settings.ts)). Shared by every
  device. The CLABE lives here. New keys do not need a migration.
- **Device settings** — browser `localStorage` via
  [`lib/device-settings.ts`](../lib/device-settings.ts). Terminal name, etc.

## Model map

| Model | Purpose |
| --- | --- |
| `users` | Admin and staff accounts (password and/or PIN) |
| `sales` / `sale_items` | Orders; `source_type` names the account |
| `products` / `recipes` / `supplies` | Menu, recipes, inventory (`supplies.active` is soft-delete) |
| `customer` / `debtors` | CRM and unpaid-to-debt lifecycle |
| `bill` | Expenses (egresos), optional `jornadaId` |
| `salary` | Payroll rows |
| `jornada` | Shift open/close; sales and bills attach here |
| `savings_movement` / `savings_goal` / `goal_contribution` | Savings |
| `setting` | Business-wide key/value config |

Enums: `SaleStatus` (`UNPAID`, `PAID`, `DEBT`, `CANCELLED`),
`PaymentMethod` (`CASH`, `TRANSFER`), `JornadaStatus`,
`SavingsMovementType`, `GoalStatus`.
