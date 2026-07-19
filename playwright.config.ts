import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export const E2E_DATABASE_URL =
    process.env.E2E_DATABASE_URL ?? "postgresql://postgres@localhost:5433/comalpos_test_e2e";

// The sandboxed chromium build is preinstalled; using its explicit path
// avoids any dependency on the revision @playwright/test was pinned to.
const chromium = { executablePath: "/opt/pw-browsers/chromium" };
const ADMIN_STATE = "tests/e2e/.auth/admin.json";

export default defineConfig({
    testDir: "tests/e2e",
    timeout: 60_000,
    expect: { timeout: 10_000 },
    // One worker, ordered files: the specs share the seeded database.
    fullyParallel: false,
    workers: 1,
    reporter: [["list"]],
    globalSetup: "./tests/e2e/global-setup.ts",
    use: {
        baseURL: `http://localhost:${PORT}`,
        launchOptions: chromium,
    },
    projects: [
        { name: "setup", testMatch: /auth\.setup\.ts/ },
        {
            name: "desktop",
            use: { ...devices["Desktop Chrome"], storageState: ADMIN_STATE, launchOptions: chromium },
            dependencies: ["setup"],
        },
        {
            // Mobile pass over the redesigned views (expenses) and the POS.
            name: "mobile",
            use: { ...devices["Pixel 7"], storageState: ADMIN_STATE, launchOptions: chromium },
            dependencies: ["setup"],
            testMatch: /\d+-(expenses|pos)\.spec\.ts/,
        },
    ],
    webServer: {
        command: `npx next dev -p ${PORT}`,
        url: `http://localhost:${PORT}/login`,
        reuseExistingServer: true,
        timeout: 180_000,
        env: {
            DATABASE_URL: E2E_DATABASE_URL,
            AUTH_SECRET: "e2e-test-secret-key-0123456789",
            AUTH_TRUST_HOST: "true",
        },
    },
});
