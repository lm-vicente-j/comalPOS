# Authentication and permissions

Auth.js (NextAuth v5) with the Credentials provider. Sessions are encrypted
JWTs in HTTP-only cookies. Tokens carry the user id and role and expire
after **eight hours** (`AUTH_SESSION_MAX_AGE` in
[`app/auth.config.ts`](../app/auth.config.ts)).

Generate `AUTH_SECRET` with `npx auth secret` before running the app.

## Login

| Role | Identifier | Secret |
| --- | --- | --- |
| ADMIN | email | password (bcrypt) |
| STAFF | username | 4-digit PIN (bcrypt) |

Implementation: [`lib/auth.ts`](../lib/auth.ts). Inactive users
(`users.active === false`) cannot sign in. After a successful login the
proxy sends the user to `/pos`.

## Route protection

Page navigations are gated by the Next.js 16 proxy
([`proxy.ts`](../proxy.ts)). Matcher, `authorized` flow, Edge limits, and
what the proxy does **not** cover (Server Actions) are in
[middleware.md](middleware.md).

`lib/permissions.ts` is the single ACL. The sidebar and mobile nav use the
same module so hidden links match server enforcement.

Rules are first-prefix-wins:

| Prefix | Roles |
| --- | --- |
| `/admin` | ADMIN |
| `/pos` | ADMIN, STAFF |
| `/expenses` | ADMIN, STAFF |
| `/debtors` | ADMIN, STAFF |

Any other authenticated path is allowed (the middleware still requires a
session).

## Server Actions

Actions call `auth()` themselves. Do not trust role or user id from the
form body; derive them from the session
([TECHNICAL.md](../TECHNICAL.md)).
