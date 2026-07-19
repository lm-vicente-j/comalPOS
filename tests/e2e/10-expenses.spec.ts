import { test, expect } from "@playwright/test";

test.describe("expenses", () => {
    test("creates an expense from the top dialog button and shows it in the history", async ({ page }, testInfo) => {
        const description = `Gasto e2e ${testInfo.project.name}`;
        await page.goto("/expenses");

        await page.getByRole("button", { name: "Nuevo gasto" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();

        await dialog.locator('input[type="number"]').fill("55.5");
        await dialog.getByText("Seleccionar categoría").click();
        await page.getByRole("option", { name: "Insumos" }).click();
        await dialog.getByPlaceholder("Detalle del gasto...").fill(description);
        await dialog.getByRole("button", { name: "Guardar Gasto" }).click();

        await expect(dialog).toBeHidden();
        await expect(page.getByText("Gasto guardado exitosamente.")).toBeVisible();
        await expect(page.getByText(description).first()).toBeVisible();
    });

    test("keeps the dialog open showing validation errors on empty submit", async ({ page }) => {
        await page.goto("/expenses");
        await page.getByRole("button", { name: "Nuevo gasto" }).click();

        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: "Guardar Gasto" }).click();

        await expect(dialog).toBeVisible();
        await expect(dialog.getByText("Ingrese un monto válido mayor a 0.")).toBeVisible();
        await expect(dialog.getByText("Seleccione una categoría.")).toBeVisible();
    });

    test("loads more history when reaching the end of the scroll", async ({ page }) => {
        await page.goto("/expenses");

        const rows = page.locator("tbody tr");
        // First page only, even though more rows exist.
        await expect(rows).toHaveCount(30);

        const viewport = page.locator('[data-slot="scroll-area-viewport"]').first();
        await viewport.evaluate((el) => el.scrollTo(0, el.scrollHeight));

        await expect.poll(async () => rows.count(), { timeout: 10_000 }).toBeGreaterThan(30);
    });
});
