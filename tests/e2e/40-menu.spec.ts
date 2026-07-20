import { test, expect } from "@playwright/test";

test.describe("menu products", () => {
    test("creates a product and shows it in the menu table", async ({ page }) => {
        await page.goto("/admin/menu");

        await page.getByPlaceholder("Nombre del producto...").fill("Producto E2E");
        await page.getByPlaceholder("0.00").fill("45");
        await page.getByRole("button", { name: "AGREGAR" }).click();

        // saveProduct revalidates other routes, so reload to see the fresh list.
        await page.waitForTimeout(1000);
        await page.reload();
        // Desktop and mobile managers coexist in the DOM; use the visible one.
        await page.getByPlaceholder("Buscar producto...").filter({ visible: true }).fill("Producto E2E");
        await expect(page.getByRole("cell", { name: "Producto E2E" }).first()).toBeVisible();
    });
});
