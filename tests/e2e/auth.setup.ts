import { test as setup } from "@playwright/test";

// Logs the seeded admin in through the real login form and stores the
// session cookie for every other spec.
setup("authenticate as admin", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@e2e.local");
    await page.fill('input[name="password"]', "admin1234");
    await page.getByRole("button", { name: "Entrar al Sistema" }).click();
    await page.waitForURL("**/pos", { timeout: 30_000 });
    await page.context().storageState({ path: "tests/e2e/.auth/admin.json" });
});
