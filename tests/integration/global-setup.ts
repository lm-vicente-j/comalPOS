import { ensureTestDatabaseReady } from "../test-db-gate";
import { testEnv } from "../test-env";

// Runs once in the main process, before any worker: readiness check and overwrite warning.
export default async function globalSetup() {
    process.env.DATABASE_URL ||= testEnv("TEST_DATABASE_URL");
    try {
        await ensureTestDatabaseReady(process.env.DATABASE_URL);
    } catch (error) {
        // A thrown error would reach the user as an "Unhandled Error" with a stack trace.
        await new Promise<void>((resolve) => process.stderr.write(`\n${(error as Error).message}\n`, () => resolve()));
        process.exit(1);
    }
}
