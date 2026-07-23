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

## Point of sale

Closing a table or a client account opens the **Pago de cuenta** dialog, which
shows the receipt — every product on the account and the grand total — beneath
the payment method, so the operator confirms exactly what is being charged. The
dialog is scroll-safe on small screens.

The client picker searches customers server-side (debounced), mirroring the
Salarios (Roster) module, so it scales past a client-side list.
