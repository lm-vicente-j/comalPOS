import { test, expect } from "@playwright/test";

// These run without the shared admin session.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("authentication", () => {
    test("rejects wrong credentials with a visible error", async ({ page }) => {
        await page.goto("/login");
        await page.fill('input[name="email"]', "admin@e2e.local");
        await page.fill('input[name="password"]', "wrong-password");
        await page.getByRole("button", { name: "Entrar al Sistema" }).click();

        await expect(page.getByText("Usuario o contraseña incorrectos.")).toBeVisible();
        await expect(page).toHaveURL(/\/login/);
    });

    test("redirects unauthenticated visits to the login page", async ({ page }) => {
        await page.goto("/expenses");
        await expect(page).toHaveURL(/\/login/);
    });

    test("logs in with valid credentials", async ({ page }) => {
        await page.goto("/login");
        await page.fill('input[name="email"]', "admin@e2e.local");
        await page.fill('input[name="password"]', "admin1234");
        await page.getByRole("button", { name: "Entrar al Sistema" }).click();

        await page.waitForURL("**/pos");
    });
});
