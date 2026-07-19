import { execSync } from "child_process";
import { E2E_DATABASE_URL } from "../../playwright.config";

// Reseeds the e2e database once before the whole run.
export default function globalSetup() {
    execSync("npx tsx tests/e2e/seed.ts", {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
    });
}
