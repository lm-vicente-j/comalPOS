# ComalPOS

Restaurant point-of-sale and back office. The UI is Spanish; this repository
is a Next.js 16 monolith (App Router, Server Actions, PostgreSQL).

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)
![Auth.js](https://img.shields.io/badge/Auth.js-5-black)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC)

## Prerequisites

- Node.js 20+
- PostgreSQL 16+

## Quick start

```bash
npm install
cp .env.example .env.local
npx auth secret
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Full steps, demo users, and environment variables:
[docs/getting-started.md](docs/getting-started.md).

## Documentation

| Document | What it covers |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the system is shaped |
| [TECHNICAL.md](TECHNICAL.md) | How to work in this repo |
| [CHANGELOG.md](CHANGELOG.md) | Notable changes from git history |
| [docs/getting-started.md](docs/getting-started.md) | Local setup |
| [docs/database.md](docs/database.md) | Prisma, dual URLs, data model |
| [docs/modules.md](docs/modules.md) | Routes, actions, stubs |
| [docs/auth.md](docs/auth.md) | Auth.js, roles, route ACL |
| [docs/middleware.md](docs/middleware.md) | Next.js 16 proxy, matcher, Edge ACL |
| [docs/testing.md](docs/testing.md) | Vitest and Playwright |
| [docs/deploy.md](docs/deploy.md) | Vercel and production env |
