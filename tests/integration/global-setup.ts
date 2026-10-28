import type { TestProject } from "vitest/node";
import { ensureTestDatabaseReady } from "../test-db-gate";
import { testEnv } from "../test-env";

// Runs once in the main process, before any worker: readiness check and overwrite
// confirmation. Watch mode owns stdin, so it cannot prompt and needs TEST_DB_CONFIRM=yes.
export default async function globalSetup(project: TestProject) {
    process.env.DATABASE_URL ||= testEnv("TEST_DATABASE_URL");
    try {
        await ensureTestDatabaseReady(process.env.DATABASE_URL, { interactive: !project.config.watch });
    } catch (error) {
        // A thrown error would reach the user as an "Unhandled Error" with a stack trace.
        await new Promise<void>((resolve) => process.stderr.write(`\n${(error as Error).message}\n`, () => resolve()));
        process.exit(1);
    }
}
