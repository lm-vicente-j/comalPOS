import { setTimeout as sleep } from "node:timers/promises";
import { Client } from "pg";
import { assertTestDatabase } from "./test-env";

// Tables wiped by helpers.resetDb and tests/e2e/seed.ts: all must exist for a run to make sense.
const DOMAIN_TABLES = [
    "goal_contribution", "savings_goal", "savings_movement", "debtors", "sale_items", "sales",
    "recipes", "products", "supplies", "salary", "bill", "jornada", "customer", "users",
];

const WARNING_DELAY_MS = 2000;

function notReady(reason: string): never {
    throw new Error(`#:ERR:: TEST DATABASE NOT READY\n       ${reason}\n       Run: npm run test:setup`);
}

/**
 * Runs once before a suite: the database must be reachable with its schema applied
 * (otherwise `npm run test:setup` is needed), and if it holds data the user is warned
 * that the suite is about to delete it, with a short pause to cancel (Ctrl+C).
 */
export async function ensureTestDatabaseReady(url: string | undefined) {
    assertTestDatabase(url);
    const target = new URL(url);
    const name = decodeURIComponent(target.pathname.slice(1));

    const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
    let rows = 0;
    try {
        try {
            await client.connect();
        } catch (e) {
            const error = e as { code?: string; message: string };
            notReady(error.code === "3D000"
                ? `database "${name}" does not exist on ${target.host}`
                : `cannot connect to ${target.host}: ${error.message}`);
        }
        const { rows: found } = await client.query<{ table_name: string }>(
            "select table_name from information_schema.tables where table_schema = 'public' and table_name = any($1)",
            [DOMAIN_TABLES],
        );
        const missing = DOMAIN_TABLES.filter((table) => !found.some((f) => f.table_name === table));
        if (missing.length) notReady(`schema not applied in "${name}": missing ${missing.join(", ")}`);

        for (const table of DOMAIN_TABLES) {
            const { rows: [count] } = await client.query<{ n: number }>(`select count(*)::int as n from "${table}"`);
            rows += count.n;
        }
    } finally {
        await client.end().catch(() => {});
    }

    if (rows === 0) return;

    console.warn(`\n#:WARN:: The tests will DELETE ALL DATA in database "${name}" on ${target.host} (${rows} rows now).`);
    console.warn(`       Starting in ${WARNING_DELAY_MS / 1000} seconds. Press Ctrl+C to cancel.\n`);
    await sleep(WARNING_DELAY_MS);
}
