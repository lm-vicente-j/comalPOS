#!/usr/bin/env bash
# Prepares the PostgreSQL databases used by the test suites. A missing database
# is only created after you confirm, and an existing one is only modified after
# you choose to. It never starts a server.
#
# Settings come from the inherited environment first, then from .env:
#   LOCAL_POSTGRES      directory holding the PostgreSQL client binaries (psql);
#                       falls back to psql on PATH
#   TEST_DATABASE_URL   integration database (Vitest)
#   E2E_DATABASE_URL    browser-test database (Playwright); skipped when unset
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"
cd "$ROOT"

err() {
    local msg="$1"
    shift
    printf '#:ERR:: %s\n' "$msg" >&2
    for line in "$@"; do printf '       %s\n' "$line" >&2; done
    exit 1
}

env_get() {
    local key="$1" val="${!1:-}"
    if [ -z "$val" ] && [ -f "$ENV_FILE" ]; then
        val="$(grep -E "^${key}=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -E "s/^\"(.*)\"$/\1/; s/^'(.*)'$/\1/" || true)"
    fi
    printf '%s' "$val"
}

LOCAL_POSTGRES="$(env_get LOCAL_POSTGRES)"
if [ -n "$LOCAL_POSTGRES" ]; then PSQL="$LOCAL_POSTGRES/psql"; else PSQL="$(command -v psql || true)"; fi
[ -x "$PSQL" ] || err "POSTGRES BINARIES NOT FOUND" \
    "Set LOCAL_POSTGRES in .env to the directory containing psql (for example /usr/bin)."

export PGCONNECT_TIMEOUT=5

# push_schema <url> [extra prisma db push flags]
# --url plus both variables: prisma.config.ts prefers DIRECT_URL, which .env
# points at the development database, so it must never be inherited here.
push_schema() {
    local url="$1"
    shift
    DATABASE_URL="$url" DIRECT_URL="$url" npx prisma db push "$@" --url "$url"
}

# seed_database <url> [seed command...]
seed_database() {
    local url="$1"
    shift
    if [ "$#" -gt 0 ]; then
        DATABASE_URL="$url" DIRECT_URL="$url" "$@"
    fi
}

# prepare_database <label> <url> [seed command...]
prepare_database() {
    local label="$1" url="$2"
    shift 2
    [ -n "$url" ] || err "$label DATABASE URL NOT SET" "Set it in .env (see .env.example)."

    local base="${url%%\?*}"
    local name="${base##*/}"
    local admin_url="${base%/*}/postgres"
    local rest="${base#*://}"
    rest="${rest#*@}"
    local server="${rest%%/*}"

    # Same rule as tests/test-env.ts: never operate on a non-test database.
    [[ "$name" =~ ^[A-Za-z0-9_]+_test(_e2e)?$ ]] || err "REFUSING TO USE \"$name\": NOT A TEST DATABASE" \
        "The name must end in _test or _test_e2e. This script can delete all data."

    local out
    out="$("$PSQL" "$admin_url" -Atqc "select 1" 2>&1)" || err "POSTGRES SERVER UNREACHABLE ($server)" "$out"

    local found
    found="$("$PSQL" "$admin_url" -Atqc "select 1 from pg_database where datname = '$name'")"

    if [ "$found" != "1" ]; then
        printf '#:ERR:: TEST DATABASE NOT FOUND: %s\n       Server: %s\n\n' "$name" "$server" >&2
        local answer
        read -r -p "Create \"$name\" on $server now? [y/N] " answer || answer=n
        case "$answer" in
            y|Y|yes|YES) ;;
            *) err "DATABASE NOT CREATED: $name" \
                "Nothing was modified. Create it yourself:  createdb -h <host> -p <port> -U <user> $name" ;;
        esac
        # $name matched the identifier pattern above, so it is safe to quote into SQL.
        out="$("$PSQL" "$admin_url" -Atqc "create database \"$name\"" 2>&1)" \
            || err "COULD NOT CREATE DATABASE: $name" "$out"
        echo "Created \"$name\" on $server."
        push_schema "$url"
        seed_database "$url" "$@"
        echo "\"$name\" was created and prepared."
        return 0
    fi

    printf '\nDatabase "%s" exists on %s.\n' "$name" "$server"
    printf 'Running the test suites can modify or delete its data.\n\n'
    printf '  [1] Delete ALL data in "%s" and reseed\n' "$name"
    printf '  [2] Use "%s" as is (this script changes nothing; at your own risk)\n' "$name"
    printf '  [3] Cancel\n\n'

    local choice
    while :; do
        read -r -p "Choose 1, 2 or 3: " choice || choice=3
        case "$choice" in
            1|2|3) break ;;
            *) echo "Invalid choice." ;;
        esac
    done

    case "$choice" in
        3)
            echo "Cancelled. Nothing was modified."
            exit 1
            ;;
        2)
            echo "Using \"$name\" as is."
            ;;
        1)
            push_schema "$url" --force-reset
            seed_database "$url" "$@"
            echo "\"$name\" was reset and reseeded."
            ;;
    esac
}

# The integration suites seed their own fixtures (seedBase), so they only need the schema.
prepare_database "TEST" "$(env_get TEST_DATABASE_URL)"

E2E_URL="$(env_get E2E_DATABASE_URL)"
if [ -n "$E2E_URL" ]; then
    prepare_database "E2E" "$E2E_URL" npx tsx tests/e2e/seed.ts
else
    echo "E2E_DATABASE_URL is not set: skipping the browser-test database."
fi

printf '\nReady. Run:  npm test   |   npm run test:e2e\n'
