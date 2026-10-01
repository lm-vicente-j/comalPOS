import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";


// The page renders a desktop and a mobile variant; scope to the desktop one.
const desktopRoot = "div.hidden.md\\:flex";

test.describe("inventory", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/admin/inventory");
    });

    test("creates a supply and shows it in the table", async ({ page }) => {
        const root = page.locator(desktopRoot);

        await root.getByPlaceholder("Nombre del insumo...").fill("Insumo E2E");
        await root.getByPlaceholder("0", { exact: true }).fill("25");
        await root.locator('button:has-text("...")').click();
        await page.getByText("KILOG", { exact: true }).click();
        await root.getByPlaceholder("0.00").fill("15");
        await root.getByRole("button", { name: "AGREGAR" }).click();

        await expect(root.getByText("Insumo guardado exitosamente.")).toBeVisible();

        await root.getByPlaceholder("Buscar insumo...").fill("Insumo E2E");
        await expect(root.getByRole("cell", { name: "Insumo E2E" })).toBeVisible();
    });

    test("edits a supply from the row form", async ({ page }) => {
        const root = page.locator(desktopRoot);

        await root.getByPlaceholder("Buscar insumo...").fill("Insumo E2E");
        await root.getByRole("cell", { name: "Insumo E2E" }).click();

        const form = root.locator("form:not([hidden])");
        await expect(form.getByText("Editar Insumo")).toBeVisible();

        await form.locator('input[name="name"]').fill("Insumo E2E Editado");
        await form.getByRole("button", { name: "Actualizar" }).click();

        await expect(root.getByText("Insumo guardado exitosamente.")).toBeVisible();
        await root.getByPlaceholder("Buscar insumo...").fill("Insumo E2E Editado");
        await expect(root.getByRole("cell", { name: "Insumo E2E Editado" })).toBeVisible();
    });

    test("deletes a supply and removes it from the table", async ({ page }) => {
        const root = page.locator(desktopRoot);

        await root.getByPlaceholder("Buscar insumo...").fill("Insumo E2E Editado");
        await root.getByRole("cell", { name: "Insumo E2E Editado" }).click();

        const form = root.locator("form:not([hidden])");
        // The delete trigger is the only icon-only button in the form.
        await form.getByRole("button").filter({ hasNotText: /\w/ }).click();
        await page.getByRole("button", { name: "Sí, eliminar" }).click();

        await expect(root.getByText("Insumo Eliminado")).toBeVisible();
        await expect(root.getByRole("cell", { name: "Insumo E2E Editado" })).toBeHidden();
    });
});


for (const viewport of [{ width: 1280, height: 720 }, { width: 360, height: 640 }]) {
    test("combines inventory search and stock filters at " + viewport.width + "x" + viewport.height, async ({ page }) => {
        test.setTimeout(120_000);
        const pool = new Pool({ connectionString: E2E_DATABASE_URL });
        let supplyIds: number[] = [];
        const prefix = "Filtro E2E " + Date.now().toString(36);
        const positiveName = prefix + " disponible";
        const emptyName = prefix + " agotado";
        try {
            const inserted = await pool.query<{ id: number }>(
                'INSERT INTO supplies (name, "measureUnit", "currentStock", "unitCost") VALUES ($1, $3, 5, 1), ($2, $3, 0, 1) RETURNING id',
                [positiveName, emptyName, "kg"]
            );
            supplyIds = inserted.rows.map(row => row.id);
            await page.setViewportSize(viewport);
            await page.goto("/admin/inventory");
            const root = page.locator(viewport.width < 768 ? "div.flex.md\\:hidden" : desktopRoot).filter({ visible: true });
            const search = root.getByRole("textbox", { name: "Buscar insumo", exact: true });
            const stock = root.getByRole("combobox", { name: "Filtrar por existencias", exact: true });
            await search.fill(prefix.toUpperCase());
            await expect(root.getByText(positiveName, { exact: true })).toBeVisible();
            await expect(root.getByText(emptyName, { exact: true })).toBeVisible();

            await stock.click();
            await page.getByRole("option", { name: "Con stock", exact: true }).click();
            await expect(root.getByText(positiveName, { exact: true })).toBeVisible();
            await expect(root.getByText(emptyName, { exact: true })).toHaveCount(0);

            await stock.click();
            await page.getByRole("option", { name: "Sin stock", exact: true }).click();
            await expect(root.getByText(emptyName, { exact: true })).toBeVisible();
            await expect(root.getByText(positiveName, { exact: true })).toHaveCount(0);
            await expect(search).toBeInViewport({ ratio: 1 });
            await expect(stock).toBeInViewport({ ratio: 1 });
            const capture = test.info().outputPath("inventory-stock-filter.png");
            await page.screenshot({ path: capture });
            await test.info().attach("inventory-stock-filter", { path: capture, contentType: "image/png" });

            await search.fill(positiveName);
            await expect(root.getByText("No hay insumos que coincidan.", { exact: true })).toBeVisible();
            await stock.click();
            await page.getByRole("option", { name: "Todos", exact: true }).click();
            await expect(root.getByText(positiveName, { exact: true })).toBeVisible();
            await search.fill("");
            await expect(root.getByText(emptyName, { exact: true })).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        } finally {
            if (supplyIds.length > 0) await pool.query("DELETE FROM supplies WHERE id = ANY($1::int[])", [supplyIds]);
            await pool.end();
        }
    });
}
