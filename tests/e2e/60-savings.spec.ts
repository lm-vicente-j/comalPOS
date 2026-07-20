import { test, expect } from "@playwright/test";

test.describe("savings", () => {
    test("registers a deposit and updates the pool balance", async ({ page }) => {
        await page.goto("/admin/savings");

        await page.getByRole("button", { name: "Registrar movimiento" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.locator("#amt").fill("250");
        await dialog.locator("#desc").fill("Deposito e2e");
        await dialog.getByRole("button", { name: "Guardar", exact: true }).click();

        await expect(dialog).toBeHidden();
        await expect(page.getByText("Deposito e2e")).toBeVisible();
        await expect(page.getByText("$250.00").first()).toBeVisible();
    });

    test("creates a goal and adds a contribution", async ({ page }) => {
        await page.goto("/admin/savings");

        // Goals now live in their own tab next to the pool.
        await page.getByRole("tab", { name: "Metas" }).click();
        await page.getByRole("button", { name: "Nueva meta" }).click();
        let dialog = page.getByRole("dialog");
        // The dialog labels are not linked to their inputs; use placeholders.
        await dialog.getByPlaceholder("Ej: Horno industrial").fill("Meta E2E");
        await dialog.getByPlaceholder("50000").fill("500");
        await dialog.getByRole("button", { name: "Crear meta" }).click();
        await expect(dialog).toBeHidden();
        await expect(page.getByText("Meta E2E")).toBeVisible();

        await page.getByRole("button", { name: "Sumar contribución" }).first().click();
        dialog = page.getByRole("dialog");
        await dialog.getByPlaceholder("0.00").fill("100");
        await dialog.getByRole("button", { name: "Confirmar" }).click();
        await expect(dialog).toBeHidden();

        await expect(page.getByText("$100.00 de $500.00")).toBeVisible();
    });
});
