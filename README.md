# ComalPOS

Restaurant point of sale and back office with a Spanish UI. This repository is a
Next.js 16 application using React 19, Server Actions, Auth.js 5, Prisma 7 and
PostgreSQL. Desktop and mobile browsers use the same backend.

## Start here

1. Set up a local database and run the app: [Getting started](docs/getting-started.md).
2. Understand the request flow and code boundaries: [Architecture](ARCHITECTURE.md).
3. Find a screen: [Modules](docs/modules.md).
4. Check the implemented rules before changing behavior: [Business rules](docs/business-rules.md).
5. Find a server function and its permission/return contract: [Action reference](docs/actions.md).
6. Run the relevant checks: [Testing](docs/testing.md).

## Prerequisites

- Node.js 20.19+, 22.12+, or 24+ within the engine ranges in `package-lock.json`.
- npm and PostgreSQL (the repository's test helper targets PostgreSQL 16).
- A dedicated local development database.

## Quick start

Create the database named in `.env.example` first. These commands work in PowerShell:

```powershell
Copy-Item .env.example .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Paste the generated secret into `AUTH_SECRET` in `.env` and fill in both database URLs.
Then run:

```bash
npm ci
npx prisma migrate dev
npm run dev
```

Open [localhost:3000](http://localhost:3000). An empty database has no login account.
The optional `npx prisma db seed` creates demo users and a large dataset, but
**deletes existing domain data**. Read the seed section in
[Getting started](docs/getting-started.md) before running it.

## Features

- Table, registered customer and walk-in accounts; cash/transfer settlement and debts.
- Inventory, product recipes and prices, customers and staff.
- Expenses, salary payments, jornadas (cash shifts), savings movements and goals.
- Shared business settings and per-browser terminal settings.
- ADMIN-only descriptive statistics and CSV/print reports (beta).

Optimiza/predictions have no implemented pages. A walk-in ticket is an account
identifier; the POS does not implement a receipt-printer integration.

## Documentation

| Document | Purpose |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, data flow, transactions and runtime boundaries |
| [TECHNICAL.md](TECHNICAL.md) | Development conventions and documentation maintenance |
| [CHANGELOG.md](CHANGELOG.md) | Curated changes following Keep a Changelog |
| [docs/getting-started.md](docs/getting-started.md) | Environment, setup, demo seed and scripts |
| [docs/modules.md](docs/modules.md) | Routes, screens, desktop/mobile behavior |
| [docs/business-rules.md](docs/business-rules.md) | State changes, formulas, validations and existing limits |
| [docs/actions.md](docs/actions.md) | All exported domain actions, schemas and supporting helpers |
| [docs/database.md](docs/database.md) | Models, relations, date/money storage and connection URLs |
| [docs/auth.md](docs/auth.md) | Login, sessions, route and action permissions |
| [docs/middleware.md](docs/middleware.md) | Request interception in `proxy.ts` |
| [docs/testing.md](docs/testing.md) | Integration and browser suites, platform requirements |
| [docs/deploy.md](docs/deploy.md) | Build, migrations and deployment configuration |

Documentation describes the checked-in implementation as of 2026-10-01, including
its limitations. Feature names in the UI are Spanish; code identifiers and this
developer documentation remain in English.
