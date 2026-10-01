import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";

test.describe("crm", () => {

    for (const viewport of [{ width: 320, height: 568 }, { width: 1280, height: 720 }]) {
        test("orders and searches customers at " + viewport.width + "x" + viewport.height, async ({ page }, testInfo) => {
            test.setTimeout(120_000);
            const pool = new Pool({ connectionString: E2E_DATABASE_URL });
            const prefix = "Orden CRM E2E " + viewport.width;
            let ids: number[] = [];
            try {
                const { rows } = await pool.query<{ id: number }>(
                    'INSERT INTO customer ("customerName", "currentBalance", "registeredDate") VALUES ($1, 0, $5), ($2, 0, $6), ($3, 0, $6), ($4, 0, NULL) RETURNING id',
                    [prefix + " Alfa", prefix + " Zulu", prefix + " Bravo", prefix + " Sin fecha", "2025-01-01", "2026-01-01"]
                );
                ids = rows.map((row) => row.id);
                await page.setViewportSize(viewport);
                await page.goto("/admin/crm");

                const search = page.getByPlaceholder("Buscar cliente...").filter({ visible: true });
                const order = page.getByRole("button", { name: "Ordenar clientes" });
                await search.fill(prefix);
                const names = page.getByText(new RegExp("^" + prefix)).filter({ visible: true });
                await expect(names).toHaveText([prefix + " Bravo", prefix + " Zulu", prefix + " Alfa", prefix + " Sin fecha"]);

                const searchBox = await search.boundingBox();
                const orderBox = await order.boundingBox();
                expect(searchBox).not.toBeNull();
                expect(orderBox).not.toBeNull();
                expect(orderBox!.x + orderBox!.width).toBeLessThanOrEqual(searchBox!.x);

                await order.click();
                await expect(page.getByRole("menuitemradio", { name: "Más recientes" })).toHaveAttribute("aria-checked", "true");
                await page.getByRole("menuitemradio", { name: "Nombre A–Z" }).click();
                await expect(names).toHaveText([prefix + " Alfa", prefix + " Bravo", prefix + " Sin fecha", prefix + " Zulu"]);

                await search.fill(prefix + " Zulu");
                await expect(names).toHaveText([prefix + " Zulu"]);
                await search.fill(prefix);
                await order.click();
                await expect(page.getByRole("menuitemradio", { name: "Nombre A–Z" })).toHaveAttribute("aria-checked", "true");
                await page.screenshot({ path: testInfo.outputPath("crm-customer-order.png") });
                await testInfo.attach("crm-customer-order", { path: testInfo.outputPath("crm-customer-order.png"), contentType: "image/png" });
                await page.getByRole("menuitemradio", { name: "Más recientes" }).click();
                await expect(names).toHaveText([prefix + " Bravo", prefix + " Zulu", prefix + " Alfa", prefix + " Sin fecha"]);
                expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
            } finally {
                if (ids.length) await pool.query("DELETE FROM customer WHERE id = ANY($1::int[])", [ids]);
                await pool.end();
            }
        });
    }

    test("registers a new customer", async ({ page }) => {
        await page.goto("/admin/crm");

        await page.getByPlaceholder("Nombre Completo").fill("Cliente Playwright");
        await page.getByPlaceholder("XXXX-XXXX-XX").fill("555-111-22");
        await page.getByRole("button", { name: "Registrar Nuevo Cliente" }).click();

        await page.waitForTimeout(1000);
        await page.reload();
        // Desktop and mobile managers coexist in the DOM; use the visible one.
        await page.getByPlaceholder("Buscar cliente...").filter({ visible: true }).fill("Cliente Playwright");
        await expect(page.getByText("Cliente Playwright").first()).toBeVisible();
    });

    test("registers a new admin employee", async ({ page }) => {
        await page.goto("/admin/crm");
        await page.getByRole("tab", { name: "Empleados" }).click();

        // Both the edit and the create employee forms are in the DOM; use
        // the visible (non-hidden) one.
        const form = page.locator("form:not([hidden])").filter({ hasText: "Registrar Nuevo Empleado" });
        await form.getByPlaceholder("Nombre Completo").fill("Empleado Playwright Prueba");
        await form.getByText("Seleccionar Rol").click();
        await page.getByRole("option", { name: "Administrador" }).click();
        await form.getByPlaceholder("Contraseña...").fill("e2epass1");
        await form.getByRole("button", { name: "Registrar Nuevo Empleado" }).click();

        await page.waitForTimeout(1000);
        await page.reload();
        await page.getByRole("tab", { name: "Empleados" }).click();
        await page.getByPlaceholder("Buscar empleado...").filter({ visible: true }).fill("Empleado Playwright");
        await expect(page.getByText("Empleado Playwright Prueba").first()).toBeVisible();
    });
});
