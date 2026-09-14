# Testing

Two suites: Vitest (integration, real Postgres) and Playwright (browser).
They use **separate** databases so they cannot overwrite each other.

## Integration (Vitest)

```bash
npm test
```

- Config: [`vitest.config.ts`](../vitest.config.ts)
- Specs: [`tests/integration/*.test.ts`](../tests/integration/)
- Default database: `postgresql://postgres@localhost:5433/comalpos_test`
  (override with `DATABASE_URL`)
- Files run sequentially; they share one schema

Covered actions: sales, jornada, expenses, debts, users, savings, products,
payrolls, inventory, customers.

## End-to-end (Playwright)

```bash
npm run test:e2e
```

- Config: [`playwright.config.ts`](../playwright.config.ts)
- Specs: [`tests/e2e/*.spec.ts`](../tests/e2e/)
- Dev server on port **3100**
- Default database: `postgresql://postgres@localhost:5433/comalpos_test_e2e`
  (override with `E2E_DATABASE_URL`)
- One worker; desktop Chrome plus a mobile pass over expenses and POS
- Chromium path is pinned to `/opt/pw-browsers/chromium` (CI image)

## Test database script

```bash
npm run test:db
```

[`scripts/test-db.sh`](../scripts/test-db.sh) starts a throwaway PostgreSQL
16 cluster on port **5433** and `prisma db push`es both test databases.

This script is **bash + Linux**. It hard-codes
`/usr/lib/postgresql/16/bin`. It does not run as-is on Windows. On Windows,
point `DATABASE_URL` / `E2E_DATABASE_URL` at a local Postgres and apply the
schema yourself (`npx prisma db push` or `migrate dev`).
