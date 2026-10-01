# Modules

The UI uses Spanish feature names and English route paths. Route groups such as
`(dashboard)` do not appear in URLs. Permissions below describe screen access;
action-level checks are in [Action reference](actions.md).

## Route map

| UI | Route | Action source | Screen access | Status |
| --- | --- | --- | --- | --- |
| Login | `/login` | `auth_action.ts` | Guest | Implemented |
| Inicio | `/` | — | Session | Welcome page |
| Ventas / POS | `/pos` | `sales.ts`, `customers.ts`, `debts.ts` | ADMIN, STAFF | Implemented |
| Deudores | `/debtors` | `debts.ts` | ADMIN, STAFF | Implemented |
| Egresos | `/expenses` | `expenses.ts` | ADMIN, STAFF | Implemented |
| Inventario | `/admin/inventory` | `inventory.ts` | ADMIN | Implemented |
| Menú | `/admin/menu` | `products.ts`, `inventory.ts` | ADMIN | Implemented |
| CRM | `/admin/crm` | `customers.ts`, `users.ts` | ADMIN | Implemented |
| Salarios | `/admin/roster` | `payrolls.ts`, `users.ts` | ADMIN | Implemented |
| Ahorros | `/admin/savings` | `savings.ts` | ADMIN | Implemented |
| Jornada | `/admin/jornada` | `jornada.ts` | ADMIN | Implemented; STAFF sees only the banner |
| Ajustes | `/admin/settings` | `settings.ts` | ADMIN | Implemented |
| Estadísticas | `/admin/statistics` | `analytics.ts` | ADMIN | Implemented beta |
| Reportes | `/admin/reports` | `analytics.ts` | ADMIN | Implemented beta |

[Sidebar](../components/layout/sidebar.tsx) and
[mobile navigation](../components/layout/mobile-nav.tsx) use the route ACL.
Jornada controls are reached through the banner, rather than a sidebar entry.
Mobile ADMIN users see management links in the Menu sheet; STAFF has the three
primary operational links.

Optimiza navigation definitions mention `/admin/analysis/engine`,
`/admin/analysis/predictions`, `/admin/analysis/accuracy` and
`/admin/analysis/supply`, but there are no corresponding pages. The group is
hidden; do not treat these definitions as implemented routes.

## Point of sale

Desktop [`pos-manager.tsx`](../app/(dashboard)/pos/pos-manager.tsx) and
[`MobilePosManager.tsx`](../app/(dashboard)/pos/MobilePosManager.tsx) share actions.
Operators search products, choose a table/customer/walk-in ticket and add items.
Each tap normally creates an UNPAID sale; quantity/remove operations adjust stock.
Optimistic rows appear immediately with controls disabled until a real ID arrives.

Only UNPAID records appear in an account's order list. Cerrar cuenta pays its
records in the active jornada; A deuda transfers nominated records to a customer.
Settling returns to the venta libre view. Open walk-in tickets reuse the lowest
available number; closing a paid ticket through Cerrar cuenta changes it to
VENTA_LIBRE. Debt collection does not perform that source rewrite.

Desktop closing shows a receipt aggregated by product and an explicit button.
Mobile cash payment additionally requires received amount and shows change or
missing cash. Both use the shared transfer confirmation with CLABE/total.
See [Payment rules](business-rules.md) for which checks are local to the UI.

An OPEN jornada is required for new sales and account closure. The POS data
loader is today's non-cancelled sales, not an all-time account recovery screen.

## Debtors

Desktop tables and mobile customer cards group pending debt by customer and show
amount, active debtors and today's collections. Operators review sale details and
collect selected debts fully in cash or by transfer. The shared debt payment
dialog requires received cash/change or manual transfer confirmation.

The operational list and the beta debt report have different filters; see
[Debt/report rules](business-rules.md).

## Inventory and menu

Inventory lists active supplies, edits name/stock/unit/cost and deactivates supplies.
Both layouts support name search, in-stock/out-of-stock filtering and the
kg/g/Lt/piece unit picker.

Menu lists products, price, current recipe cost and utility per unit. Desktop
supports recipe selection/replacement when saving; the mobile editor preserves
an omitted recipe when editing. Name search is available. Product deletion is
physical and can fail for database references.

## CRM

Separate customer/user tabs support search and create/edit dialogs. Customer
ordering is newest registration first or name A-Z. Customers have name/optional
phone; staff forms manage identity, role, active status and replacement
credentials. Stored hashes are represented as presence flags.

There is no customer/user delete action. See [CRM rules](business-rules.md) for
the fields actually persisted on create versus update.

## Expenses and salary

Egresos shows an all-time expense total and incrementally loads 30-row history.
Its dialog registers description, amount, category and date into the active
jornada with the session user.

Salarios searches users on the server and loads that user's payment history.
ADELANTO/BONO/SUELDO entries show a summary, then a final confirmation before
creating the payment. No reversal action is implemented; salary does not
automatically create an expense or reduce expected jornada cash.

## Savings and jornada

Ahorros manages the pool's deposits/withdrawals, recent movement pages and goal
progress. Pool movements require an OPEN jornada; goals and contributions are
separate from pool money.

Jornada shows opening user, paid cash/transfer totals, expenses, expected cash and
employee breakdown. ADMIN can open or close a shift, including another admin's
shift. Closing requires a nonnegative counted amount and no UNPAID accounts.
Controls and totals remain reachable in the scrollable mobile closing dialog.
STAFF receives a read-only open/closed notice.

## Settings

Ajustes has business and device tabs. Business CLABE is stored server-side and
shared by every terminal. Device name is stored in that browser's localStorage.
The payment dialog reads CLABE for manual transfer confirmation; blank CLABE
does not stop confirmation once loading finishes.

## Statistics and reports (beta)

Statistics presents paid-sale amount/units/record counts, equal-length period
comparisons, daily/hour/weekday distributions, product/origin/payment-method
breakdowns, expenses, salaries and identified customer activity.

Reports offers sales/products/expenses/salaries/customers/debts. Date shortcuts,
custom ranges, type and page are reflected in the URL. Tables have 50-row pages.
CSV and browser printing fetch all matching rows and totals; printing can save
a PDF. These are authenticated ADMIN exports.

Dates, status selection, missing data and balance limitations are defined in
[Business rules](business-rules.md). Optimiza, forecasts and historical profit
remain outside the implemented scope.
