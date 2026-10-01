# Deployment

The repository targets a Vercel-style serverless Next.js deployment. No Docker
setup or deployment CI workflow is checked in. For a local instance, follow
[Getting started](getting-started.md).

## Install and build

```bash
npm ci
npm run build
npm start
```

`npm ci` runs `prisma generate` through `postinstall`.
The build script is `npx prisma migrate deploy && next build`.
`npm start` serves the completed production build when self-hosting; Vercel
manages its runtime separately.

Build therefore needs a reachable migration database and can change its schema.
It does not run the demo seed. If migrations fail, the application build stops.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Runtime Prisma/pg connection |
| `DIRECT_URL` | Session/direct connection for migrations; CLI falls back to DATABASE_URL if unset |
| `AUTH_SECRET` | Unique secret for JWT session encryption |
| `AUTH_TRUST_HOST` | Configure when required by the hosting/proxy setup |

For the project's Supabase pattern, runtime uses the transaction pooler
(typically 6543), migrations use the session/direct connection (typically 5432).
Use the actual values supplied by the target project rather than treating these
ports as universal. Background: [Database](database.md).

Set the appropriate environment for production and each preview. A preview build
also runs migrations against its configured connection; isolate the intended
database. Use a Node version inside the locked dependency engine ranges.

## Operational behavior

- Server Actions and Auth.js run within the application, using a four-connection
  pool per instance. Include capacity for multiple runtime instances.
- Shared changes reach other visible terminals through 10-second polling, not a
  WebSocket subscription. See [Architecture](../ARCHITECTURE.md).
- Business CLABE lives in the database; terminal labels remain in each browser.
- Authenticated ADMIN CSV/print reports query current data when requested.
- General bank reconciliation, scheduled jornada close and external receipt
  printing are not implemented.

## Verification after deployment

Verify login for both roles, ADMIN-only access, an open jornada's POS/expense
flow, transfer CLABE, inventory updates and report export on the intended
environment. Confirm migrations applied to the target database and no demo seed
was run. Use real deployment credentials; the demo seed and e2e users are local
test data.

Expected-cash and reporting limitations are in
[Business rules](business-rules.md); they still apply in production.
