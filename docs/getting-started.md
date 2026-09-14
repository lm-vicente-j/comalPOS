# Getting started

Local setup for ComalPOS. Production deploy is in [deploy.md](deploy.md).

## 1. Install

```bash
npm install
```

`postinstall` runs `prisma generate`.

## 2. Environment

Copy the example file and fill it in:

```bash
cp .env.example .env.local
npx auth secret
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | App runtime (Prisma adapter in `lib/prisma.ts`) |
| `DIRECT_URL` | local: optional | Prisma CLI (migrate / db push). Falls back to `DATABASE_URL` |
| `AUTH_SECRET` | yes | Auth.js JWT encryption. Generate with `npx auth secret` |

On a single local Postgres instance, `DATABASE_URL` and `DIRECT_URL` can be
the same. Why they differ on Vercel is explained in [database.md](database.md).

## 3. Database

PostgreSQL must be running. Default in `.env.example`:

`postgresql://postgres:postgres@localhost:5432/comal_pos`

```bash
npx prisma migrate dev
npx prisma db seed
```

The seed script prints the demo credentials. After a default seed:

- Admin username `admin`, password `demopass123`, PIN `1234`
- Email `admin@demo.com`
- Extra staff users `staff2`, `staff3`, … same password and PIN

These accounts are for local development only.

## 4. Run

```bash
npm run dev
```

Open `http://localhost:3000`. Login lands on `/pos` when the session is
valid.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | `prisma migrate deploy` then `next build` |
| `npm run lint` | ESLint |
| `npm test` | Vitest integration tests |
| `npm run test:e2e` | Playwright |
| `npm run test:db` | Throwaway Postgres for tests (Linux/bash; see [testing.md](testing.md)) |
