# Changelog

Notable changes to ComalPOS are recorded here. The format follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).

There are no release tags or verified SemVer releases. The dated entries below
are curated development checkpoints reconstructed from commit history, using
commit dates, rather than published release versions. Historical checkpoints
can summarize several related commits. The package version `0.1.0` does not
establish a release date. New changes go under Unreleased until a release or
dated checkpoint is recorded.

## [Unreleased]

### Added

- Complete business-rule reference and exported action/helper catalog for developers.

### Changed

- Update architecture, module map, database, authorization, setup, testing and
  deployment documentation to match the current implementation.
- Clarify payment confirmation boundaries, cash formulas, historical reporting
  limits, destructive demo/test seeds and Prisma environment/connection handling.
- Refresh this changelog with recent functionality and linked historical checkpoints.

## [2026-10-01] - 2026-10-01

### Added

- ADMIN-only descriptive statistics with date filters, preceding-period comparisons,
  sales distributions, products, expenses, salaries and customer activity.
- Sales, products, expenses, salaries, customers and current-debt reports with
  50-row pages, complete CSV export and browser printing.
- Manual transfer-received confirmation with shared CLABE/total dialog in desktop
  and mobile POS and Deudores.
- Analytics integration/browser coverage, including mobile views and exports.

## [2026-09-30] - 2026-09-30

### Added

- Required cash-received confirmation and change calculation in mobile POS.
- Cash-received/change confirmation in Deudores and two-step salary registration.
- Inventory stock filters, grams as a unit option and CRM registration/name ordering.

### Fixed

- Keep mobile payment totals and buttons reachable during scrolling.
- Prevent Enter in the mobile cash input from recording payment.
- Show insufficient/invalid cash errors and keep jornada closing controls visible.
- Require a nonblank expense description and show it alongside category in history.

## [2026-09-14] - 2026-09-14

### Added

- Split developer documentation into architecture, technical notes, changelog and
  setup/auth/database/module/testing/deployment references.

### Changed

- Replace the previous checked-in SQL dump with Prisma schema/migration guidance.

## [2026-09-12] - 2026-09-12

### Fixed

- Truncate the POS A deuda customer label so it stays in the action row.

## [2026-07-31] - 2026-07-31

### Added

- Dedicated mobile POS and jornada summary.
- Reusable walk-in tickets and one Cerrar cuenta flow for all account types.
- Optimistic product taps, line quantity changes and removal.

### Changed

- Load POS data in parallel and reduce transferred fields.
- Deduplicate jornada queries per render and pause layout refresh during tracked actions.

### Fixed

- Remove duplicate reloads after POS writes and clear the account view after settlement.

## [2026-07-24] - 2026-07-24

### Added

- Business/device settings tabs, shared CLABE and per-browser terminal name.
- Account receipt and server-side customer search in POS.

### Changed

- Run Prisma migration deployment as part of build.
- Separate runtime and migration database connection URLs.

## [2026-07-21] - 2026-07-21

### Added

- Real UNPAID table/customer lifecycle with jornada close blocked by open accounts.
- Session checks on domain actions and server-derived sale/expense attribution.
- Shared refresh across sessions, read-only STAFF jornada notice and mobile
  management views.
- Integration coverage for mutations, browser CRUD flows and incremental history.
- Dialog-based expense registration.

### Fixed

- Scope account closure to the active jornada and exclude unpaid/cancelled sales
  from expected cash.
- Keep credential hashes on the server, harden user/customer/product actions,
  bind menu price inputs and stabilize history ordering.
- Reject product prices below base cost when a recipe is supplied.
- Fix native scrolling and narrow-screen interactions in mobile POS.

### Removed

- Replaced BannerRefresher component.

## [2026-07-18] - 2026-07-18

### Added

- Auth.js JWT credentials login with eight-hour sessions.
- Centralized route permissions, mobile navigation and login loading feedback.

### Fixed

- Hide the mobile Menu entry when a role has no additional options.
- Allow numeric inventory/menu inputs to be cleared.

## [2026-06-04] - 2026-06-04

### Changed

- Update application dependencies.

## [2026-05-27] - 2026-05-27

### Added

- Jornada cash-shift records and open/close workflow.
- Savings pool movements and goals.
- Cash/transfer payment methods and inventory soft deletion.

### Fixed

- Sales summaries and POS product filters.

## [2026-04-14] - 2026-04-14

### Added

- Shared Zod schemas/action validation, form feedback and mobile inventory.
- Expense category and receipt-path fields.

### Fixed

- CRM password updates and role-dependent PIN controls.
- Optional login fields, expense submission and inventory/menu number handling.

## [2026-03-24] - 2026-03-24

### Added

- Database-backed customer/user CRM and debt collection.
- POS-to-debt conversion, customer consumption tracking and debtor sale uniqueness.
- Sale status enum and persisted sidebar selection.

### Fixed

- POS sale creation/today history, debt totals/details and menu edit field mapping.
- Inventory listing/number casts and CRM form/tab behavior.

## [2026-01-27] - 2026-01-27

### Added

- POS, debtors, inventory, menu, CRM, expenses, login and role-based UI.
- App layout/sidebar navigation and Prisma generation on install.

## [2025-12-30] - 2025-12-30

### Added

- Initial application generated from Create Next App.

[Unreleased]: https://github.com/lm-vicente-j/comalPOS/compare/37173f0...HEAD
[2026-10-01]: https://github.com/lm-vicente-j/comalPOS/compare/33cdbce...37173f0
[2026-09-30]: https://github.com/lm-vicente-j/comalPOS/compare/d7b19c2...33cdbce
[2026-09-14]: https://github.com/lm-vicente-j/comalPOS/compare/8703fbc...d7b19c2
[2026-09-12]: https://github.com/lm-vicente-j/comalPOS/compare/2636e7e...8703fbc
[2026-07-31]: https://github.com/lm-vicente-j/comalPOS/compare/bd4edb1...2636e7e
[2026-07-24]: https://github.com/lm-vicente-j/comalPOS/compare/1f1b24e...bd4edb1
[2026-07-21]: https://github.com/lm-vicente-j/comalPOS/compare/b35dffb...1f1b24e
[2026-07-18]: https://github.com/lm-vicente-j/comalPOS/compare/aee78b2...b35dffb
[2026-06-04]: https://github.com/lm-vicente-j/comalPOS/compare/9a23bca...aee78b2
[2026-05-27]: https://github.com/lm-vicente-j/comalPOS/compare/08bd728...9a23bca
[2026-04-14]: https://github.com/lm-vicente-j/comalPOS/compare/20f96c1...08bd728
[2026-03-24]: https://github.com/lm-vicente-j/comalPOS/compare/06824ac...20f96c1
[2026-01-27]: https://github.com/lm-vicente-j/comalPOS/compare/166ccf1...06824ac
[2025-12-30]: https://github.com/lm-vicente-j/comalPOS/commit/166ccf1
