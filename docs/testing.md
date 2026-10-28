# Testing

Vitest runs integration tests against real PostgreSQL; Playwright runs browser
flows with a separate database. Neither suite is a mocked in-memory substitute.

**Fixtures delete data in their selected database.** Use isolated test databases,
never the development database containing work you want to keep or production.
This behavior is in [`helpers.ts`](../tests/integration/helpers.ts) and
[`tests/e2e/seed.ts`](../tests/e2e/seed.ts).

## Before running tests

Prepare the test databases first:

```bash
npm run test:setup
```

It checks that the test databases exist (offering to create them) and applies their
schema; see [Test setup](#test-setup). Run it on a new machine, after the schema
changes, or whenever you want a clean database.

Both suites also check the database themselves before running anything. This check
([`test-db-gate.ts`](../tests/test-db-gate.ts)) runs once, from Vitest's
`globalSetup` and from Playwright's global setup:

| State of the test database | What `npm test` / `npm run test:e2e` does |
| --- | --- |
| Server unreachable, database missing, or tables missing | Aborts before any test with `#:ERR:: TEST DATABASE NOT READY`, the reason, and `Run: npm run test:setup` |
| Ready and empty | Runs |
| Ready and holding rows | Prints `#:WARN::` that the tests will delete all data in that database (with the row count) and asks `Continue? [y/N]`. Anything but `y` aborts with `#:ERR:: CANCELLED BY USER` and modifies nothing |
| Holding rows, run not interactive (piped stdin, or `vitest --watch`) | Aborts with `#:ERR:: CONFIRMATION REQUIRED` unless `TEST_DB_CONFIRM=yes` is in the environment |

The tests leave their fixtures behind, so every run after the first finds rows and
asks again; `TEST_DB_CONFIRM=yes npm test` answers yes in advance. The variable is
read only from the inherited environment, never from `.env`, so the confirmation
cannot be disabled permanently by accident. The check verifies that the tables exist,
not that their columns match the current schema: after a schema change, reset with
`npm run test:setup` option 1.

## Integration tests

```bash
npm test
npm test -- tests/integration/sales.test.ts
npm test -- tests/integration/analytics.test.ts
```

[`vitest.config.ts`](../vitest.config.ts) selects
`tests/integration/**/*.test.ts`, Node environment, sequential files, and
30-second test/hook timeouts.

[`setup.ts`](../tests/integration/setup.ts) uses an inherited `DATABASE_URL` or, if
there is none, `TEST_DATABASE_URL` from the environment or `.env`. It never reads the
development `DATABASE_URL` from `.env`. Either value goes through a guardrail
([`test-env.ts`](../tests/test-env.ts)): the database name must end in `_test` or
`_test_e2e`, otherwise the run aborts with `#:ERR:: REFUSING TO RUN` before any
fixture runs. Tests mock authentication and revalidation while executing the
domain actions against a real database.

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

- `E2E_DATABASE_URL` from the environment or `.env`, with no default. Global setup
  aborts if it is unset or its database name does not end in `_test`/`_test_e2e`.
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

## Test setup

[`scripts/test-db.sh`](../scripts/test-db.sh), called by `npm run test:setup`, checks
the test databases and prepares them. It requires bash and `psql`. It never starts
a server, and it only creates or modifies a database after you confirm.

Settings come from the inherited environment, then `.env` (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `LOCAL_POSTGRES` | Directory holding the PostgreSQL client binaries (`psql`), for example `/usr/bin`; falls back to `psql` on `PATH` |
| `TEST_DATABASE_URL` | Integration database used by Vitest |
| `E2E_DATABASE_URL` | Browser-test database used by Playwright; skipped by the helper when unset |

For each database the helper:

1. Refuses any name that does not end in `_test` or `_test_e2e`
   (`#:ERR:: REFUSING TO USE "<name>": NOT A TEST DATABASE`).
2. Connects to the server (`#:ERR:: POSTGRES SERVER UNREACHABLE` otherwise).
3. If the database does not exist, prints `#:ERR:: TEST DATABASE NOT FOUND: <name>` and
   asks `Create "<name>" on <server> now? [y/N]`. `y` creates it, applies the schema
   (and, for the e2e database, runs `tests/e2e/seed.ts`). Anything else, or closing
   stdin, stops with `#:ERR:: DATABASE NOT CREATED` and status 1, creating nothing.
4. If it exists, prints its name and server and asks:
   `1` delete all data and reseed, `2` use it as is without changes (at your own
   risk), `3` cancel. Cancelling, or closing stdin, exits with status 1 and
   modifies nothing.

Option 1 runs `prisma db push --force-reset --url <that database>`, so the schema is
recreated; for the e2e database it then runs `tests/e2e/seed.ts`. The integration
suites seed their own fixtures, so they need no seed. The explicit `--url` matters:
`prisma.config.ts` prefers `DIRECT_URL`, which in `.env` points at the development
database.

```bash
npm run test:setup    # offers to create the databases on first run
npm test
npm run test:e2e
```

## Choosing checks

- Documentation-only change: check Markdown links, paths, action coverage,
  formatting and `git diff --check`; no DB mutation is needed.
- Any test run on a new machine or after a schema change: `npm run test:setup` first.
- Action/rule change: run the relevant integration file; include browser checks
  when the affected behavior is a UI confirmation or flow.
- UI change: run the relevant desktop/mobile browser specs and targeted lint.
- Schema/auth/permissions change: run the impacted cross-module checks.

`npm run lint` runs ESLint. `npm run build` is not a read-only check: it applies
migrations first. Do not run it against a database chosen merely for documentation
verification.
