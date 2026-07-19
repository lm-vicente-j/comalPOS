import { test, expect } from "@playwright/test";

// Runs last: it closes the shared open jornada and opens a fresh one.
test.describe("jornada", () => {
    test("closes the active jornada with a physical count", async ({ page }) => {
        await page.goto("/admin/jornada");

        await page.getByRole("button", { name: "Cerrar jornada" }).click();
        await page.locator("#actual").fill("1000");
        await page.getByRole("button", { name: "Confirmar cierre" }).click();

        await expect(page.getByText("Iniciar jornada")).toBeVisible({ timeout: 15_000 });
    });

    test("opens a new jornada with an opening amount", async ({ page }) => {
        await page.goto("/admin/jornada");

        await page.getByPlaceholder("0.00").fill("500");
        await page.getByRole("button", { name: "Abrir jornada" }).click();

        await expect(page.getByRole("heading", { name: /Jornada #\d+/ })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole("button", { name: "Cerrar jornada" })).toBeVisible();
    });
});
