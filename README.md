# Smart POS 
> High-performance point-of-sale system with demand prediction engine.


![Next.js](https://img.shields.io/badge/Next.js-16-black)
![C++](https://img.shields.io/badge/C++-Engine-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC)

## Authentication

Authentication uses Auth.js credentials with encrypted JWT sessions stored in
secure HTTP only cookies. Tokens contain the user id and role, expire after
eight hours, and are used to protect both authenticated and admin routes.

Copy `.env.example` to `.env.local`, configure `DATABASE_URL`, and generate a
unique authentication secret before starting the app:

```bash
npx auth secret
```

## Settings

The **Ajustes** module (`/admin/settings`, admin only) splits configuration in
two, by where it belongs:

- **Business settings** are shared by every device and stored on the server in
  the `setting` key/value table (`lib/actions/settings.ts`). The
  **CLABE** — the 18-digit interbank account customers transfer to — lives
  here. New business settings can be added without a migration by introducing
  a new key.
- **Device settings** describe a single terminal and are persisted only in that
  browser's `localStorage` (`lib/device-settings.ts`, a Zustand store). The
  device name (e.g. "Caja principal") is one, so each terminal keeps its own
  identity without touching the server.

Apply the database migration for the settings table before using the module:

```bash
npx prisma migrate deploy   # or: npx prisma migrate dev
```

## Database connections (runtime vs. migrations)

The app runs on serverless (Vercel), so it needs **two connection strings** —
they are read independently:

- `DATABASE_URL` — the **runtime** connection used by the app
  (`lib/prisma.ts`, via the `pg` driver adapter). On a pooled database use the
  **transaction pooler** (Supabase: port `6543`, `?sslmode=require`), which
  multiplexes many serverless clients over few connections. The adapter caps
  each instance to a single connection (`max: 1`).
- `DIRECT_URL` — used only by the Prisma CLI for `migrate deploy` / `db push`
  (`prisma.config.ts`). Migrations need a real session (DDL and advisory
  locks), so use a **session or direct** connection (Supabase: the **Session
  pooler** on port `5432`; the true Direct connection is IPv6-only and
  unreachable from Vercel's IPv4 build). Falls back to `DATABASE_URL` locally.

Because `build` runs `prisma migrate deploy && next build`, set both variables
in the deployment environment. Using the transaction pooler for migrations
(`6543`) breaks them; using a session connection for the runtime exhausts its
client limit — keep each URL to its role.

## Point of sale

Closing a table or a client account opens the **Pago de cuenta** dialog, which
shows the receipt — every product on the account and the grand total — beneath
the payment method, so the operator confirms exactly what is being charged. The
dialog is scroll-safe on small screens.

The client picker searches customers server-side (debounced), mirroring the
Salarios (Roster) module, so it scales past a client-side list.
