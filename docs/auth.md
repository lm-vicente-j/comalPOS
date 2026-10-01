# Authentication and permissions

Auth.js 5 uses the Credentials provider in [`lib/auth.ts`](../lib/auth.ts).
Shared callbacks/session configuration live in
[`app/auth.config.ts`](../app/auth.config.ts). Auth handlers are exported by
[`app/api/auth/route.ts`](../app/api/auth/route.ts).

## Login and session

| Login mode | Identifier | Secret |
| --- | --- | --- |
| ADMIN | Trimmed valid email | Password |
| STAFF | Trimmed nonempty username | Exactly four numeric PIN digits |

The provider finds a user and compares the bcrypt credential. A missing credential,
bad comparison or `active === false` rejects sign-in. The stored normalized role
becomes the session role; the selected form mode does not grant ADMIN.

`login` in [`auth_action.ts`](../lib/actions/auth_action.ts) validates a UserSchema
subset, chooses mode from whether email is present and redirects to `/pos` after
sign-in. `logout` redirects to `/login`.

Sessions use encrypted JWT cookies and an eight-hour `AUTH_SESSION_MAX_AGE`.
The callbacks store `token.sub` as user ID and the normalized role, then expose them
on `session.user`. Legacy `token.id` is a fallback for ID. Non-ADMIN roles normalize
to STAFF.

Generate `AUTH_SECRET` and put it in `.env` as described in
[Getting started](getting-started.md). Login checks user activity/credentials;
subsequent session callbacks do not requery role/activity. An existing session
is not automatically revoked by editing the database user.

## Page permissions

[`lib/permissions.ts`](../lib/permissions.ts) defines the ACL used by the proxy,
desktop sidebar and mobile navigation.

| Exact prefix or descendant path | Allowed roles |
| --- | --- |
| `/admin` | ADMIN |
| `/pos` | ADMIN, STAFF |
| `/expenses` | ADMIN, STAFF |
| `/debtors` | ADMIN, STAFF |

Rules are first-match-wins. Prefix matching uses whole path segments:
`/admin` and `/admin/menu` match, `/administrator` does not.
An authenticated path matching no rule is allowed by the ACL, though it may have
no page. Guests require login for matched routes. See
[Request interception](middleware.md).

## Action permissions

Every domain action checks for a session or an ADMIN role; login/logout are
authentication entry points. Route restrictions and hidden links are not
substitutes for function-level authorization.

| Operation group | Actual action check |
| --- | --- |
| Sales creation/edit/cancel/closure, debts, expenses | Session; selected operations also require an OPEN jornada |
| Customer create/edit | Session, despite ADMIN-only CRM page |
| User, product and supply writes | ADMIN |
| Salary writes, jornada open/close | ADMIN |
| Savings writes and settings writes | ADMIN |
| Statistics, reports and exports | ADMIN for every query |
| Most other reads/searches | Session; not generally ADMIN-only |

Use the per-function [Action reference](actions.md) for empty/error defaults and
exceptions. Sale/expense/savings attribution is taken from the session.
Typed input alone does not validate ownership, role or status. Existing business
checks and gaps are detailed in [Business rules](business-rules.md).
