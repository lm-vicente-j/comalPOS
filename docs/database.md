# Database

The schema is [`prisma/schema.prisma`](../prisma/schema.prisma). Prisma 7
generates a client at `app/generated/prisma`, which is ignored by Git.
The runtime client in [`lib/prisma.ts`](../lib/prisma.ts) uses
`@prisma/adapter-pg` and a pool maximum of four connections per instance.

## Runtime and migration connections

| Variable | Reader | Use |
| --- | --- | --- |
| `DATABASE_URL` | `lib/prisma.ts`; demo seed | Application queries and writes |
| `DIRECT_URL` | `prisma.config.ts` | Prisma CLI migrations, schema push and introspection |

The CLI imports `dotenv/config`, loads `.env` and falls back to `DATABASE_URL` if
`DIRECT_URL` is unset. A shell-provided variable takes precedence. Next.js can
add its own `.env.local` override, so keep the two processes pointed at the
intended database. See [Getting started](getting-started.md).

For the project's Vercel/Supabase deployment pattern, runtime uses a transaction
pooler URL (typically port 6543) and migrations use a session/direct connection
(typically port 5432). These are provider-specific values: take the actual
connection strings from the target project. Locally both can target the same
PostgreSQL instance.

`npm run build` applies `prisma migrate deploy` before the application build.
A missing `DIRECT_URL` is not inherently an error because the fallback exists;
a connection unsuitable for migrations can still make the build fail.

## Models and relationships

| Model | Purpose and constraints |
| --- | --- |
| `users` | Login identity, active flag, role, bcrypt password/PIN; referenced by sales, expenses, salary, jornadas and savings |
| `customer` | Name/phone/alias, registration/consumption dates and stored current debt balance |
| `products` | Unique name (40 characters), current price and recipes |
| `supplies` | Stock, cost, measure unit, `active` soft-delete flag |
| `recipes` | Product/supply join; composite primary key `(productID, supplyID)` and quantity used |
| `sales` | Total, current status, source, customer, placing user and optional jornada |
| `sale_items` | Product, quantity, historical unit price and subtotal |
| `debtors` | One row per sale (`saleID` unique), customer, amount, status and optional payment date |
| `bill` | Expense amount/category/description/date, registering user and optional jornada |
| `salary` | User, payment amount/date and period description; no jornada relation |
| `jornada` | Opening/closing users and timestamps, status, opening/expected/actual cash |
| `savings_movement` | DEPOSIT/WITHDRAW amount, registering user and optional jornada |
| `savings_goal` | Target, deadline, status and contributions |
| `goal_contribution` | Goal contribution; cascades when its parent goal is deleted |
| `setting` | Shared key/value settings; key primary key and update timestamp |

Most domain foreign keys use no-action behavior, so deleting a referenced product
can fail. Supplies are deactivated rather than physically deleted.
A recipe uses one row per product/supply pair; adding the same supply twice
violates the composite key.

## Enums

| Enum | Values |
| --- | --- |
| `SaleStatus` | `UNPAID`, `PAID`, `DEBT`, `CANCELLED` |
| `PaymentMethod` | `TRANSFER`, `CASH` |
| `JornadaStatus` | `OPEN`, `CLOSED` |
| `SavingsMovementType` | `DEPOSIT`, `WITHDRAW` |
| `GoalStatus` | `ACTIVE`, `COMPLETED`, `CANCELLED` |

`sales.payment_method` is a nullable string column, although action/UI contracts
use CASH/TRANSFER. It is not stored as the `PaymentMethod` enum.
`users.role` is also a nullable string column rather than a database enum.

## Money, quantities and historical data

Amounts, stock and recipe quantities are PostgreSQL Decimal values. Sale item
quantities are integers. Sales persist `unitPrice` and `subtotal` when created;
later menu prices do not rewrite those values. Recipes, supply costs and names
are current data, not historical snapshots.

Analytics sum money using Decimal and serialize to numbers for client display.
Older sale calculations use numbers converted from Decimal. Cash change in the
mobile POS and debt dialog is calculated with integer cents; the received amount
and change are not stored.

`customer.currentBalance` is incremented/decremented by debt conversion/collection.
It is not a database view automatically recalculated from debt rows.
See [Business rules](business-rules.md) for cancellation and reconciliation limits.

## Date semantics

| Fields | Storage / interpretation |
| --- | --- |
| `sales.createdAt` | Non-null timestamp (`@db.Timestamp(6)`); analytics groups in America/Mexico_City |
| `bill.date`, `salary.payDate`, `debtors.paidAt` | Nullable `@db.Date` calendar dates, without a time of day |
| `customer.lastConsumption` / `registeredDate` | Nullable `@db.Date` calendar dates |
| Jornada open/close, savings creation/deadline, user registration | DateTime fields; see the schema for nullable/default values |

There is no general sale-settlement timestamp. Paying old debt changes the
sale's current status/method but keeps its creation date and original jornada.
Date-based analytics cannot reconstruct cash collections or historical balances.
The POS's today query and debt summary use the server's local start/end of day;
they do not use the analytics timezone helper.

## Accounts, indexes and settings

Accounts are source strings: `MESA_<n>`, `CL- <name>`, `VL-<n>` and
`VENTA_LIBRE`. `source_type` is limited to 30 characters and is not unique.
There is no account record or ticket reservation table.

Indexes cover sale jornada/customer-date, sale item sale/product, debt customer
and status, bill jornada, jornada status/open date, savings jornada/date and
contribution goal. There is no unique constraint enforcing a single OPEN jornada.

Business CLABE is in `setting` under key `CLABE`. Only that key is implemented
in [`settings.ts`](../lib/actions/settings.ts). Device name stays in browser
`localStorage`; it has no database record.

## Schema maintenance

- Development: `npx prisma migrate dev` against a local development database.
- Deployment: `npx prisma migrate deploy` applies committed migrations.
- Test setup: `npx prisma db push` on isolated test databases, with both connection
  variables set appropriately; see [Testing](testing.md).
- Demo seed: destructive replacement of domain data in `DATABASE_URL`.
- Sequence utility: [`prisma/sequence_fix.ts`](../prisma/sequence_fix.ts) resets
  selected table ID sequences using the runtime connection; it is not run by build.

The migration directory is the schema history; application change history is
[CHANGELOG.md](../CHANGELOG.md).
