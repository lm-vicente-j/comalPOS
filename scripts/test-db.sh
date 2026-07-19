#!/usr/bin/env bash
# Boots a throwaway PostgreSQL 16 cluster for the test suites and applies
# the Prisma schema. Prints the DATABASE_URL to use. Idempotent: safe to
# re-run; an already-running cluster is reused.
#
#   TEST_PGDATA  data directory  (default: /tmp/comalpos-test-pg)
#   TEST_PGPORT  port            (default: 5433)
set -euo pipefail

PGBIN=/usr/lib/postgresql/16/bin
DATA="${TEST_PGDATA:-/tmp/comalpos-test-pg}"
PORT="${TEST_PGPORT:-5433}"
DB=comalpos_test
URL="postgresql://postgres@localhost:$PORT/$DB"

as_postgres() {
    if [ "$(id -u)" = "0" ]; then
        su postgres -s /bin/bash -c "$1"
    else
        bash -c "$1"
    fi
}

if [ ! -f "$DATA/PG_VERSION" ]; then
    mkdir -p "$DATA"
    [ "$(id -u)" = "0" ] && chown postgres:postgres "$DATA"
    as_postgres "$PGBIN/initdb -D '$DATA' -A trust" >/dev/null
fi

if ! as_postgres "$PGBIN/pg_ctl -D '$DATA' status" >/dev/null 2>&1; then
    as_postgres "$PGBIN/pg_ctl -D '$DATA' -o '-p $PORT -k $DATA' -l '$DATA/server.log' start" >/dev/null
fi

as_postgres "$PGBIN/createdb -h localhost -p $PORT -U postgres $DB" 2>/dev/null || true

DATABASE_URL="$URL" npx prisma db push >/dev/null

echo "$URL"
