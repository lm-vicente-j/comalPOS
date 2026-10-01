# Action and helper reference

All exported functions in `lib/actions/` are listed here, using their existing
names. They are Server Actions, not HTTP REST endpoints. Parameter types are
summarized below; the linked source is the exact TypeScript definition.

**Session** means `auth()` must return a user; **ADMIN** means the action itself
checks the role. UI route permissions are separate. Read defaults vary by action,
so do not assume a common error shape. Domain rules and known validation limits
are in [Business rules](business-rules.md).

## Authentication — [auth_action.ts](../lib/actions/auth_action.ts)

| Function | Input and result |
| --- | --- |
| `login(prevState, formData)` | Public login form; infers ADMIN from email, otherwise STAFF; validates selected user-schema fields, calls credentials sign-in and redirects to `/pos`; failures contain error/fieldErrors |
| `logout()` | Calls sign-out and redirects to `/login` |

## Sales — [sales.ts](../lib/actions/sales.ts)

All require Session. Empty unauthenticated read results are `[]`.

| Function | Input, result and effect |
| --- | --- |
| `createSale(sale_items, status, source_type, customerID, paymentMethod = "CASH")` | Items are productID/quantity; status UNPAID/PAID/DEBT; server prices/stock/customer updates in transaction; success has saleId/message, failures use error or message |
| `nextFreeSaleTicket()` | Requires OPEN jornada; returns `{ success: true, sourceType }` or `{ success: false, message }`; selection is not reservation |
| `closeAccountAction(sourceType, paymentMethod = "CASH")` | Pays matching active-jornada UNPAID records; success has count, including zero; failures use message |
| `getSalesHistory()` | All sales, newest first, with related data, numeric total and item-record count; unpaginated |
| `getTodaySalesHistory()` | Today's non-CANCELLED sales by server day, selected relations, Decimal/date serialization; unpaginated |
| `cancelSaleAction(saleId)` | Cancels sale and restores stock using current recipes; success or error; invalid-sale result can omit success |
| `updateSaleQuantity(saleId, quantity, productId)` | Adjusts item quantity/stock/total; quantity below one cancels whole sale; success/message result |

## Debts — [debts.ts](../lib/actions/debts.ts)

All require Session. Debt operations use nominated IDs and database totals.

| Function | Input and result |
| --- | --- |
| `getAllDebtors()` | Group DEBT rows by customer with amount, customer and sales; `[]` on absent session or caught query failure |
| `getDebtsSummary()` | `{ totalAmount, activeDebtors, todayPayments }`; zero values on absent session/caught failure |
| `getDebtorHistory(id)` | One debtor row or null; unauthorized/query failures return success/error |
| `toDebt(customerId, sales)` | Converts nominated UNPAID records; `{ msg: "SUCCESS" }` or UNAUTHORIZED/NO_UNPAID_SALES/INTERNAL ERROR; caught failure may include error |
| `payAccount(customerID, sales, paymentMethod)` | Settles nominated DEBT sales fully; msg SUCCESS/UNAUTHORIZED/NO_DEBT_SALES/INTERNAL ERROR |

Neither debt mutation requires an OPEN jornada. Customer association and
concurrency limits are described in [Business rules](business-rules.md).

## Customers — [customers.ts](../lib/actions/customers.ts)

| Function | Authorization | Input and result |
| --- | --- | --- |
| `getAllCustomers()` | Session | Customers ordered by name descending; `[]` on absent session/caught failure |
| `searchCustomers(query, limit = 20)` | Session | Case-insensitive name/alias search, alphabetic results with id/name/alias; `[]` on absent session/caught failure |
| `saveCustomer(data)` | Session | Partial Customer; saves id/name/phone, creates registration/balance defaults; success/error/fieldErrors |

## Users — [users.ts](../lib/actions/users.ts)

| Function | Authorization | Input and result |
| --- | --- | --- |
| `GetAllUsers()` | Session | Alphabetic public user fields plus hasPassword/hasPin; excludes credential hashes; `[]` on absent session/caught failure |
| `searchUsers(query, limit = 20)` | Session | Name/username search; id/name/username/registeredAt, alphabetic; `[]` on absent session/caught failure |
| `saveUser(data)` | ADMIN | Partial User, create/update active/role/name and selected credential; bcrypt hashing; success/error/fieldErrors |

## Inventory — [inventory.ts](../lib/actions/inventory.ts)

| Function | Authorization | Input and result |
| --- | --- | --- |
| `saveSupply(data)` | ADMIN | Supply; number casts then SupplySchema validation and upsert; success/error/fieldErrors |
| `getSuppliesData()` | Session | Active supplies alphabetically; `[]` on absent session/caught failure |
| `deleteSupply(id)` | ADMIN | Sets active false; success/error |

## Products — [products.ts](../lib/actions/products.ts)

| Function | Authorization | Input and result |
| --- | --- | --- |
| `saveProduct(data)` | ADMIN | Product; schema and supplied-recipe base-cost check; upsert, preserve/replace recipe according to input; success/error/fieldErrors |
| `deleteProduct(id)` | ADMIN | Physical delete; may fail for relations; success/error, denied result may omit success |
| `getProductsData()` | Session | Alphabetic products with recipes/supplies; `[]` without session, success/error object on caught failure |

## Expenses — [expenses.ts](../lib/actions/expenses.ts)

| Function | Authorization | Input and result |
| --- | --- | --- |
| `saveExpense(data)` | Session + OPEN jornada | amount/category/description/date; validates BillSchema subset, session attribution; success/error/fieldErrors |
| `getExpenses(offset = 0, limit = 30)` | Session | `{ items, total, hasMore }`; total is all-time; empty/zero result without session; DB errors can propagate |

## Payroll — [payrolls.ts](../lib/actions/payrolls.ts)

| Function | Authorization | Input and result |
| --- | --- | --- |
| `saveSalaryPayment(data)` | ADMIN | userID/amount/period; SalarySchema subset, payDate now; success/error/fieldErrors (caught DB failure can be success false only) |
| `getSalaryHistory(userID, offset = 0, limit = 30)` | Session | Per-user `{ items, hasMore }`; empty result without session/caught failure |
| `getUserPayrollInfo(userID)` | Session | User name/registeredAt or null |

Salary registration does not require an open jornada and does not create a bill.

## Jornada — [jornada.ts](../lib/actions/jornada.ts)

| Function | Authorization | Input and result |
| --- | --- | --- |
| `hasOpenJornada()` | Session | Boolean, false without session; request-cached |
| `openJornada(openingAmount)` | ADMIN | Nonnegative finite opening cash; success/error; pending error adds pendingJornadaId |
| `closeJornada(jornadaId, actualClosingAmount)` | ADMIN | Nonnegative finite counted cash, OPEN check, no UNPAID sales; saves closing data; OPEN_ACCOUNTS adds sourceType/count/total list |
| `getActiveJornadaWithStats()` | Session | null without session; NO_JORNADA with currentUserId or OWN_OPEN/OTHER_OPEN with serialized jornada, stats and currentUserId; request-cached |
| `getJornadaEmployeeBreakdown(jornadaId)` | Session | Paid records and totals by placing user, descending totalSold; `[]` without session |

## Savings — [savings.ts](../lib/actions/savings.ts)

| Function | Authorization | Input and result |
| --- | --- | --- |
| `getPoolBalance()` | Session | `{ balance, deposited, withdrawn }`; zero values without session |
| `getRecentMovements(limit = 20, offset = 0)` | Session | `{ items, hasMore }`, descending timestamp with userName; limit precedes offset |
| `saveMovement(amount, type, description?)` | ADMIN + OPEN jornada | Positive finite amount, DEPOSIT/WITHDRAW, withdrawal balance check; success or message |
| `getGoalsWithProgress()` | Session | Goal/currentAmount/progressPercent; `[]` without session |
| `saveGoal(data)` | ADMIN | Optional id, name/targetAmount, optional deadline/description; success or message |
| `cancelGoal(id)` | ADMIN | Sets CANCELLED; success or message |
| `addContribution(goalId, amount, note?)` | ADMIN | Positive finite contribution; transaction may complete ACTIVE goal; success or message |

Uncaught savings read failures propagate. Goal contributions are independent
from pool money and do not require an open jornada.

## Settings — [settings.ts](../lib/actions/settings.ts)

| Function | Authorization | Input and result |
| --- | --- | --- |
| `getSettings()` | Session | `{ clabe }`, empty string without session/caught failure |
| `saveSettings(data)` | ADMIN | Partial BusinessSettings; blank or 18 digits after outer trim; CLABE upsert; success/error/fieldErrors |

## Analytics — [analytics.ts](../lib/actions/analytics.ts)

All three check ADMIN themselves, including direct export calls. Inputs are
runtime validated.

| Function | Input and result |
| --- | --- |
| `getStatistics(input)` | `{ from, to }`; AnalyticsResult<StatisticsData> |
| `getReport(input)` | `{ from, to, type, page? }`; AnalyticsResult<ReportData>, 50-row page |
| `getReportExport(input)` | Same validated input; AnalyticsResult<ReportData> with all matching rows |

`AnalyticsResult<T>` is `{ success: true, data: T }` or
`{ success: false, error, message }`. Error codes are `PERMISSION_DENIED`,
`INVALID_FILTER`, `QUERY_FAILED`. Dates are valid ISO calendar dates and must be
ordered. Page is a positive safe integer (numeric digit strings accepted), default
1. Export still validates page, then returns page 1 with all rows.
See [Business rules](business-rules.md) for metric definitions.

## Shared schemas — [schemas.ts](../lib/actions/schemas.ts)

| Export | Purpose |
| --- | --- |
| `SaleStatusSchema` / `PaymentMethodSchema` | Accepted status/payment literals |
| `BillSchema` | Expense shape, positive amount, date and attribution |
| `CustomerSchema` | Customer and optional related-data shape; writes use only name/phone subset |
| `DebtorsSchema` | Debt data shape; debt actions also define their own result schema/type |
| `ProductSchema` / `RecipesSchema` | Menu price and recipe shapes |
| `SalarySchema` | Positive payment, user/date/period |
| `SaleItemsSchema` / `SalesSchema` | Sale item/sale shapes; not fully applied by sales actions |
| `SupplySchema` | Inventory shape, nonnegative stock, unit cost at least 1 |
| `UserSchema` | User shape; writes/login use different subsets |
| `AnalyticsFilterSchema` | Valid calendar-date range |
| `ReportTypeSchema` | sales/products/expenses/salaries/customers/debts |
| `AnalyticsReportSchema` | Range plus report type/page |

The module also exports inferred Bill, Customer, Debtors, Product, Recipes,
Salary, SaleItems, Sales, Supply and User types. The sales/debt action files export
their separate `Sale`/`Debtor` result types.

## Supporting exported functions and stores

### Account source helpers — [pos-source.ts](../lib/pos-source.ts)

| Function | Purpose |
| --- | --- |
| `freeTicketSource(ticketNumber)` / `tableSource(tableNumber)` / `customerSource(customerName)` | Build VL-/MESA_/CL- identifiers |
| `freeTicketNumber(source)` | Positive integer from VL- identifier, otherwise null |
| `isFreeTicket(source)` | Checks whether a source parses as a ticket |
| `isAccountSource(source)` | Table/customer/ticket account classification |
| `formatSourceType(source)` | Spanish display label; unknown values preserved |
| `nextFreeTicketNumber(openTicketNumbers)` | Lowest unused positive number |

Constants are `FREE_SALE_SOURCE`, `FREE_TICKET_PREFIX`, `TABLE_PREFIX` and
`CUSTOMER_PREFIX`. Database reservation is not part of these helpers.

### Analytics helpers — [analytics.ts](../lib/analytics.ts)

| Function | Purpose |
| --- | --- |
| `businessDate(date?)` / `businessHour(date)` | Calendar date/hour in BUSINESS_TIME_ZONE |
| `shiftCalendarDate(value, days)` / `calendarDays(from, to)` | Calendar shifting and day difference |
| `isCalendarDate(value)` | Strict YYYY-MM-DD validation with round-trip check |
| `defaultAnalyticsFilter(days = 30, now?)` | Inclusive recent range |
| `analyticsPeriod(filter, now?)` | Current/preceding equal-length periods, includesToday |
| `businessMidnight(value)` | Resolve calendar midnight to an instant in the business zone |
| `timestampRange(filter)` / `calendarRange(filter)` | Timestamp or date-column query boundaries |
| `compareAmounts(current, previous)` | Numeric difference/percentage; action aggregates use Decimal internally |
| `saleOrigin(source)` / `paymentMethodLabel(method)` | Origin/payment grouping labels |
| `specified(value)` | "Sin especificar" for blank/missing text |
| `money(value)` | MXN display |
| `calendarDateLabel(value)` / `businessDateTimeLabel(value)` | Calendar-date or business-zone timestamp formatting |
| `formatReportCell(value, kind)` | Text/money/integer/date/datetime/percent display |
| `reportCsv(report)` | CSV escaping, formula neutralization, BOM and totals |
| `analyticsUrl(path, filter, extras?)` | Query-string links |

Constants: `BUSINESS_TIME_ZONE` = America/Mexico_City, `REPORT_PAGE_SIZE` = 50,
`REPORT_NAMES`. Exported analytics types define filter/period/result/comparison,
group/product/customer metrics, statistics and report columns/rows/data.

### Auth and UI state

| Source | Exports and responsibility |
| --- | --- |
| [`lib/auth.ts`](../lib/auth.ts) | Auth.js `auth`, `handlers`, `signIn`, `signOut` |
| [`lib/auth-types.ts`](../lib/auth-types.ts) | USER_ROLES/UserRole; `normalizeUserRole(role)` defaults non-ADMIN to STAFF |
| [`lib/permissions.ts`](../lib/permissions.ts) | ROUTE_PERMISSIONS; `canAccessRoute(role, pathname)` uses first segment-prefix rule |
| [`lib/action-tracker.ts`](../lib/action-tracker.ts) | `trackAction(promise)` counts in-flight actions; `hasPendingActions()` reads the count |
| [`lib/use-polling.ts`](../lib/use-polling.ts) | `usePolling(callback, interval = 10000)` runs on visible ticks/tab return |
| [`lib/device-settings.ts`](../lib/device-settings.ts) | `useDeviceSettings` store: deviceName/setDeviceName/markHydrated; `useDeviceSettingsHydration()` rehydrates after mount |
| [`lib/store.ts`](../lib/store.ts) | `useStore`: count/userName/subMenu, increment/setUserName/setSubMenu/reset, persisted in app-storage |
| [`lib/utils.ts`](../lib/utils.ts) | `cn(...inputs)` combines conditional classes and Tailwind conflicts |
| [`optimistic-sale.ts`](../app/(dashboard)/pos/optimistic-sale.ts) | `makeOptimisticSale(id, product, sourceType)`, `isOptimisticSale(sale)`, `salesOptimisticReducer(current, action)` for local add/remove/quantity overlays |

Route components and `components/ui/` are presentation entry points; their
internal handlers are described by the module flows rather than treated as
additional domain APIs.
