# Changelog

Notable changes to ComalPOS Dates are commit
dates. There are no version tags.

The format follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [2026-09-12]

### Fixed

- Truncate the POS “A deuda” button so it stays on the action row.

## [2026-07-31]

### Added

- Optimistic product taps and line edits on the POS.
- One **Cerrar cuenta** flow for tables, clients, and walk-in tickets.
- Walk-in (venta libre) tickets (`VL-<n>` → `VENTA_LIBRE` when paid).
- Dedicated mobile POS view and a mobile jornada summary.

### Changed

- Pause layout auto-refresh while a mutation is in flight.
- Load the POS page in parallel and slim the queries.
- Deduplicate jornada statistics on each render.

### Fixed

- Duplicate POS reloads after every action.

## [2026-07-23]

### Added

- Ajustes module: business settings (`setting` table, CLABE) and per-device
  settings (`localStorage`).
- Account receipt in the payment dialog and a Roster-style server-side
  client picker.

### Changed

- Split business and device settings into top-level tabs.
- Document settings and POS dialog behavior (later moved into `docs/`).

### Fixed

- Separate `DATABASE_URL` (runtime) and `DIRECT_URL` (migrations) for
  serverless.
- Run `prisma migrate deploy` as part of `npm run build`.

## [2026-07-20]

### Added

- Real `UNPAID` lifecycle for table and client accounts.
- Block jornada close while accounts are still open.
- Auto-refresh shared data across concurrent sessions.
- Read-only jornada notice for staff.
- Mobile redesign for deudores, jornada, menú, CRM, salarios, and ahorros.
- Integration tests for mutating Server Actions and e2e coverage for
  create/edit/delete flows.
- Expenses dialog entry and compact summary cards.
- Incremental history loading on scroll.

### Changed

- Return to a clean venta libre after closing a table.
- Centralize role-based route permissions.
- Require a JWT session on every Server Action.
- Mobile POS layout (3-tap sale flow) and mobile bottom-sheet navigation.

### Fixed

- Scope `closeAccountAction` to the open jornada.
- Derive sale and expense attribution from the session.
- Native scrolling on the mobile POS product list.
- Mask stored credentials; harden user, customer, and product actions.
- Bind the menu price input; stabilize history ordering.

### Removed

- `BannerRefresher` (replaced by the auto-refresh path).

## [2026-07-18]

### Added

- JWT authentication (Auth.js credentials, 8-hour sessions).
- Loading state on the login button.

### Fixed

- Hide the mobile Menu tab when the role has no extra options.
- Allow numeric inventory and menu inputs to be cleared.

## [2026-05]

### Added

- Jornada module and `jornada` table (open/close shift, cash expected).
- Savings module (movements and goals).
- Cash or transfer as POS payment methods.
- Soft-delete on inventory (`supplies.active`).

### Fixed

- Sales summary display and POS product filters.

## [2026-04]

### Added

- Zod schemas shared by forms and Server Actions.
- Mobile inventory layout.
- Form status alerts across modules.

### Fixed

- Auth error message on failed login.
- CRM password updates, PIN switch by role, and UserSchema optionals.
- Expense category on `bill` and expense submit.
- Inventory and menu numeric casts and validations.

## [2026-03]

### Added

- CRM connected to the database (customers and staff tables).
- Persist selected sidebar module.
- Customer name in the POS “send to debt” dialog.
- Debtors module wired to the database; POS can send a sale to debt.
- `SaleStatus` enum; unique sale id on debtors.

### Fixed

- POS add-sale and “today” sales history.
- Menu edit form reset and field mapping.
- Inventory table listing and integer casts.
- Debtors amounts, detail view, and UNPAID-only POS table.
- Login user field changed from a list to an input.

## [2026-01]

### Added

- Initial Next.js app, layout, and sidebar (including submodules).
- POS UI (seatings, free sale, close-sale dialog).
- Debtors, expenses, CRM, and menu module shells.
- Inventory UI connected to the database.
- Login and role-based access.
- Prisma generation on install; role field on users.

## [2025-12-30]

### Added

- Repository created from Create Next App.
