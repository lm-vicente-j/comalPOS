# Technical notes

Read [Architecture](ARCHITECTURE.md) for boundaries,
[Business rules](docs/business-rules.md) for behavior, and
[Action reference](docs/actions.md) for existing function contracts before
changing a feature.

## Working in this repository

1. Install the locked dependencies with `npm ci` and generate Prisma through
   `postinstall`. Use the environment instructions in
   [Getting started](docs/getting-started.md).
2. Find the module's page, manager component and action file in
   [Modules](docs/modules.md).
3. Keep a change within the requested scope. Preserve existing names,
   dependencies, folder structure and technologies unless a requirement needs
   an explicit change.
4. For a schema change, edit `prisma/schema.prisma` and create a migration using
   `npx prisma migrate dev` against the development database. Commit the migration.
5. Use existing `lib/actions/` Server Actions for domain operations. Validate the
   actual input at the action boundary and derive attribution from `auth()`.
6. Match the action's permission check to the operation. Putting a page under
   `/admin` or hiding a navigation link does not itself authorize a server write.
7. Update relevant desktop/mobile views and navigation only when required.
   Route access is defined in `lib/permissions.ts`.
8. Run relevant checks from [Testing](docs/testing.md), then update the
   documentation and `CHANGELOG.md`.

## Contracts that affect implementation

- Shared Zod schemas are in `lib/actions/schemas.ts`. Some actions use a subset
  with `pick`/`omit`, while sales/debt actions do not validate all arguments with
  those schemas. A TypeScript signature is not runtime validation.
- Return contracts vary: `success/error`, `success/message`, `msg`, arrays and
  paginated objects all exist. Use the documented contract of the specific action.
  Do not silently convert a query failure into an empty analytics result.
- Writes generally call `revalidatePath`. Client refreshes are supported by
  `AutoRefresh` and `usePolling`; `trackAction` pauses only layout refresh for
  wrapped promises.
- Serialize Prisma Decimal values and dates before passing data across a client
  boundary. Analytics aggregate with Decimal; older sales/cash calculations
  also use JavaScript numbers. See [Database](docs/database.md).
- Build applies migrations. Use a dedicated database before running it.
- Keep the provider/database dependencies out of `app/auth.config.ts` and
  `lib/permissions.ts`. The shared request configuration currently imports neither
  Prisma nor bcrypt.

## Account identifiers

Build and read `sales.source_type` through `lib/pos-source.ts`:

| Value | Meaning |
| --- | --- |
| `MESA_<n>` | Table account |
| `CL- <name>` | Registered customer account |
| `VL-<n>` | Open walk-in ticket |
| `VENTA_LIBRE` | Settled walk-in sale |

A product tap creates a sale record, not a complete customer visit. Closing one
account can pay multiple records. Do not use the number of sale records as the
number of tickets or visits. Detailed transitions and known limits are in
[Business rules](docs/business-rules.md).

## Settings and UI

Business settings belong to `setting` and `lib/actions/settings.ts`; currently
only `CLABE` is supported. Per-device names use `lib/device-settings.ts` and
`localStorage`. Keep product copy in Spanish. Desktop navigation appears at
`lg` and above; mobile navigation uses the bottom menu.

## Keeping documentation current

| Change | Documentation to review |
| --- | --- |
| Route, screen or navigation | `docs/modules.md` |
| Validation, payment, stock, cash or other domain rule | `docs/business-rules.md` |
| Exported action/helper, signature, permission or result | `docs/actions.md` |
| Model, enum, relation or connection handling | `docs/database.md` |
| Login, session or ACL | `docs/auth.md` and `docs/middleware.md` |
| Runtime boundary, transaction or client state | `ARCHITECTURE.md` |
| Environment, script, seed or onboarding | `README.md` and `docs/getting-started.md` |
| Test runner or platform assumptions | `docs/testing.md` |
| Build or deployment | `docs/deploy.md` |
| Notable change | `CHANGELOG.md` under `Unreleased` |

Document the actual checks in the action separately from UI controls. Link to
the source file and describe known gaps without representing a planned behavior
as implemented. Validate local Markdown links and code paths, check
`git diff --check`, and read the setup steps as a new developer would.

The changelog follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).
Group changes under the relevant standard category and keep newest entries first.
There are no release tags; dated history entries are development checkpoints,
not SemVer releases. Do not invent a release date or imply that `package.json`
version `0.1.0` identifies a published release.
