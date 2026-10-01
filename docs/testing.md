# Testing

Vitest runs integration tests against real PostgreSQL; Playwright runs browser
flows with a separate database. Neither suite is a mocked in-memory substitute.

**Fixtures delete data in their selected database.** Use isolated test databases,
never the development database containing work you want to keep or production.
This behavior is in [`helpers.ts`](../tests/integration/helpers.ts) and
[`tests/e2e/seed.ts`](../tests/e2e/seed.ts).

## Integration tests

```bash
npm test
npm test -- tests/integration/sales.test.ts
npm test -- tests/integration/analytics.test.ts
```

[`vitest.config.ts`](../vitest.config.ts) selects
`tests/integration/**/*.test.ts`, Node environment, sequential files, and
30-second test/hook timeouts.

[`setup.ts`](../tests/integration/setup.ts) defaults `DATABASE_URL` to
`postgresql://postgres@localhost:5433/comalpos_test` only if no value was inherited.
Set the intended URL explicitly. Tests mock authentication and revalidation while
executing the domain actions against a real database.

The analytics integration block additionally checks that the URL names the local
`comalpos_test` database. Keep that name when running the complete suite; an
arbitrary remote/test database name is rejected by that block.

Coverage includes sales, jornadas, debts, expenses, customers, users, products,
inventory, payroll, savings and analytics. Analytics tests cover ADMIN checks,
filter validation, current PAID status/historical prices, dates, report paging,
exports, missing amounts and CSV handling. There is no integration spec for
`settings.ts` or real credentials/session cryptography.

## Browser tests

```bash
npm run test:e2e
npm run test:e2e -- tests/e2e/20-pos.spec.ts
npm run test:e2e -- tests/e2e/80-analytics.spec.ts
```

[`playwright.config.ts`](../playwright.config.ts) uses:

- `E2E_DATABASE_URL`, default `postgresql://postgres@localhost:5433/comalpos_test_e2e`.
- A Next.js dev server on port 3100 with test-only Auth.js secret/host trust.
- One worker and shared seeded database. Global setup reseeds the database;
  it does not apply the schema.
- A setup project creating ADMIN storage state in `tests/e2e/.auth/admin.json`.
- Desktop project plus Pixel 7 viewport passes for expenses, POS and analytics.
- Installed Microsoft Edge on Windows; on other platforms the executable path
  is fixed at `/opt/pw-browsers/chromium`.

The desktop browser project name does not mean it uses Google Chrome on Windows.
Other platforms need that executable or a deliberate local config change.
`reuseExistingServer: true` can reuse a process on 3100, so verify it has the
test database/environment rather than an unrelated server.

Browser coverage includes login/access, cash/transfer confirmation, debt
collection, CRUD flows, salary confirmation, stock/CRM filters, jornada closing
and analytics/exports.

## PostgreSQL setup on Windows / an existing server

The following is an example for a local server on port 5432 with the example
postgres credentials; adapt the port/user/password to your installation.
Create the two databases once:

```bash
createdb -h localhost -p 5432 -U postgres comalpos_test
createdb -h localhost -p 5432 -U postgres comalpos_test_e2e
```

In a dedicated PowerShell session, apply the integration schema and run its suite:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/comalpos_test"
$env:DIRECT_URL = $env:DATABASE_URL
npx prisma db push
npm test
```

Then apply the browser-test schema and run Playwright:

```powershell
$env:E2E_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/comalpos_test_e2e"
$env:DATABASE_URL = $env:E2E_DATABASE_URL
$env:DIRECT_URL = $env:E2E_DATABASE_URL
npx prisma db push
npm run test:e2e
```

Both URLs are set for schema commands because `prisma.config.ts` prefers
DIRECT_URL. Close this dedicated session afterward or restore the environment
before returning to development commands.

## Linux helper

[`scripts/test-db.sh`](../scripts/test-db.sh), called by `npm run test:db`, creates
a PostgreSQL 16 cluster, starts port 5433, creates both databases and pushes schemas.
It requires bash and `/usr/lib/postgresql/16/bin`. It is not portable to Windows.
`TEST_PGDATA` and `TEST_PGPORT` override its data directory and port.

The helper sets DATABASE_URL for its schema commands but does not override
DIRECT_URL. If that variable is set in the shell or `.env`, it wins for both
pushes. Do not run the helper with a development/production DIRECT_URL.
For its default port, explicitly target the integration DB, then apply the e2e
schema separately:

```bash
DIRECT_URL=postgresql://postgres@localhost:5433/comalpos_test npm run test:db
DATABASE_URL=postgresql://postgres@localhost:5433/comalpos_test_e2e DIRECT_URL=postgresql://postgres@localhost:5433/comalpos_test_e2e npx prisma db push
DATABASE_URL=postgresql://postgres@localhost:5433/comalpos_test npm test
E2E_DATABASE_URL=postgresql://postgres@localhost:5433/comalpos_test_e2e npm run test:e2e
```

The first command's DIRECT_URL causes both helper pushes to target integration;
the second command prepares the separate e2e schema explicitly. With an overridden
port, adjust every URL. Cluster startup uses trust authentication for this local
test helper.

## Choosing checks

- Documentation-only change: check Markdown links, paths, action coverage,
  formatting and `git diff --check`; no DB mutation is needed.
- Action/rule change: run the relevant integration file; include browser checks
  when the affected behavior is a UI confirmation or flow.
- UI change: run the relevant desktop/mobile browser specs and targeted lint.
- Schema/auth/permissions change: run the impacted cross-module checks.

`npm run lint` runs ESLint. `npm run build` is not a read-only check: it applies
migrations first. Do not run it against a database chosen merely for documentation
verification.
