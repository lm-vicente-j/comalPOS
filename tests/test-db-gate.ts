import { createInterface } from "node:readline/promises";
import { Client } from "pg";
import { assertTestDatabase } from "./test-env";

// Tables wiped by helpers.resetDb and tests/e2e/seed.ts: all must exist for a run to make sense.
const DOMAIN_TABLES = [
    "goal_contribution", "savings_goal", "savings_movement", "debtors", "sale_items", "sales",
    "recipes", "products", "supplies", "salary", "bill", "jornada", "customer", "users",
];

function notReady(reason: string): never {
    throw new Error(`#:ERR:: TEST DATABASE NOT READY\n       ${reason}\n       Run: npm run test:setup`);
}

/**
 * Runs once before a suite: the database must be reachable with its schema applied
 * (otherwise `npm run test:setup` is needed), and if it holds data the user must
 * confirm that the suite is about to delete it. TEST_DB_CONFIRM=yes, read only from
 * the inherited environment, answers for non-interactive runs.
 */
export async function ensureTestDatabaseReady(url: string | undefined, { interactive = true } = {}) {
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

    if (rows === 0 || process.env.TEST_DB_CONFIRM === "yes") return;

    const warning = `The tests will DELETE ALL DATA in database "${name}" on ${target.host} (${rows} rows now).`;
    if (!interactive || !process.stdin.isTTY) {
        throw new Error(
            `#:ERR:: CONFIRMATION REQUIRED\n       ${warning}\n` +
            "       This run is not interactive: set TEST_DB_CONFIRM=yes to allow it.",
        );
    }
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    try {
        const answer = await prompt.question(`\n#:WARN:: ${warning}\nContinue? [y/N] `);
        if (!/^y(es)?$/i.test(answer.trim())) throw new Error("#:ERR:: CANCELLED BY USER. Nothing was modified.");
    } finally {
        prompt.close();
    }
}
