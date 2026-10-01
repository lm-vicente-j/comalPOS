# Modules

Spanish names in the UI. Routes are English paths. Actions live under
`lib/actions/`.

| UI | Route | Actions | Roles | Status |
| --- | --- | --- | --- | --- |
| Ventas (POS) | `/pos` | `sales.ts` | ADMIN, STAFF | Implemented |
| Deudores | `/debtors` | `debts.ts` | ADMIN, STAFF | Implemented |
| Inventario | `/admin/inventory` | `inventory.ts` | ADMIN | Implemented |
| Menú | `/admin/menu` | `products.ts` | ADMIN | Implemented |
| CRM | `/admin/crm` | `customers.ts`, `users.ts` | ADMIN | Implemented |
| Egresos | `/expenses` | `expenses.ts` | ADMIN, STAFF | Implemented |
| Salarios | `/admin/roster` | `payrolls.ts` | ADMIN | Implemented |
| Ahorros | `/admin/savings` | `savings.ts` | ADMIN | Implemented |
| Jornada | `/admin/jornada` | `jornada.ts` | ADMIN (staff: read-only banner) | Implemented |
| Ajustes | `/admin/settings` | `settings.ts` | ADMIN | Implemented |
| Estadísticas | `/admin/statistics` | `analytics.ts` | ADMIN | Implemented (beta, descriptive) |
| Reportes | `/admin/reports` | `analytics.ts` | ADMIN | Implemented (beta, CSV/print) |
| Optimiza | `/admin/analysis/*` | — | — | Not implemented (BETA, hidden in nav) |

Jornada is opened from the top banner
([`components/layout/jornada-banner.tsx`](../components/layout/jornada-banner.tsx)),
not from the sidebar. Sales and expenses fail with `NO_OPEN_JORNADA` when
the shift is closed. Closing a jornada is blocked while table, client, or
walk-in accounts are still open.

## Point of sale

Three account kinds, encoded in `sales.source_type`
([`lib/pos-source.ts`](../lib/pos-source.ts)):

- **Mesa** — `MESA_<n>`
- **Cliente** — `CL- <name>` (registered customer)
- **Venta libre** — `VL-<n>` while unpaid; rewritten to `VENTA_LIBRE` when
  charged

Closing a table, a client, or a walk-in ticket uses the same **Cerrar
cuenta** / **Pago de cuenta** dialog. The receipt lists every product on
the account and the grand total under the payment method (cash or
transfer). The dialog is scroll-safe on small screens.

The client picker searches customers on the server (debounced), same
pattern as Salarios (Roster), so it is not limited to a client-side list.

Sale status: `UNPAID` while the account is open, then `PAID`, `DEBT`, or
`CANCELLED`. Sending a ticket to debt creates a `debtors` row.

## Settings

See [database.md](database.md) for the business vs device split. Ajustes
(`/admin/settings`) shows both as top-level tabs.

## Statistics and reports (beta)

Statistics count only PAID sales, with historical line quantities and subtotals.
Dates follow sale creation and current status, not the date money was collected.
Reports cover sales, products, expenses, salaries, identified customers and
currently pending debts. Debt ranges refer to the original sale date and do not
reconstruct historical balances. Cancelled and settled debts are excluded.

The default range is the last 30 days, with today, 7-day and custom shortcuts.
Sales timestamps use America/Mexico_City; expense and salary calendar dates
are preserved. Comparisons use the preceding range of equal length. Missing
dates are excluded with a notice; query failures are errors, not empty results.

Tables show 50 rows per page; CSV and browser printing include every matching
row and report totals. Printing can save a PDF. All queries and exports require
ADMIN. No schema changes, external dependencies, forecasts, average ticket,
historical profit or exact cash-flow reconstruction are included.
