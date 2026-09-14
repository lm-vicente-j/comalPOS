# Deploy

The app is built for **Vercel** (serverless). There is no Docker setup in
this repository.

## Build

`npm run build` is:

```bash
npx prisma migrate deploy && next build
```

`postinstall` runs `prisma generate`. If `DIRECT_URL` is missing or points
at the transaction pooler, the migrate step fails and the build stops.

## Environment variables

Set all three on the Vercel project (and any preview env that runs
`build`):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Transaction pooler (Supabase port `6543`, `?sslmode=require`) |
| `DIRECT_URL` | Session pooler (Supabase port `5432`) |
| `AUTH_SECRET` | Unique secret (`npx auth secret`) |

Why the two database URLs cannot be swapped:
[database.md](database.md).

Optional: `AUTH_TRUST_HOST=true` if Auth.js warns about the host behind
the Vercel proxy (already set for the Playwright server).

## After deploy

- Run `prisma migrate deploy` only happens during `build`. Do not rely on
  a separate migrate job unless you change the build command.
- Seed is **not** part of production build. Demo users from
  `prisma/seed.ts` must not be used in production.
- Device settings stay in each terminal’s browser; they do not sync.
