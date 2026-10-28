import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "dotenv";

/**
 * Reads one key from the inherited environment, then from the repository's
 * `.env`. Only the test keys (TEST_DATABASE_URL, E2E_DATABASE_URL) are ever
 * requested: the development DATABASE_URL in that file must not reach the suites.
 */
export function testEnv(key: string): string | undefined {
    if (process.env[key]) return process.env[key];
    try {
        return parse(readFileSync(path.resolve(process.cwd(), ".env")))[key] || undefined;
    } catch {
        return undefined;
    }
}

// Same rule as scripts/test-db.sh: only `*_test` and `*_test_e2e` databases.
const TEST_DATABASE_NAME = /^[A-Za-z0-9_]+_test(_e2e)?$/;

/** The suites delete every domain row, so refuse anything not named like a test database. */
export function assertTestDatabase(url: string | undefined): asserts url is string {
    if (!url) {
        throw new Error("#:ERR:: TEST DATABASE NOT CONFIGURED. Set TEST_DATABASE_URL / E2E_DATABASE_URL in .env (see .env.example).");
    }
    const name = decodeURIComponent(new URL(url).pathname.slice(1));
    if (!TEST_DATABASE_NAME.test(name)) {
        throw new Error(
            `#:ERR:: REFUSING TO RUN: "${name}" IS NOT A TEST DATABASE. ` +
            "The suites delete all data; the database name must end in _test or _test_e2e.",
        );
    }
}
