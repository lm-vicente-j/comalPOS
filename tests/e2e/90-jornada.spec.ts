import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";

// Runs last: it closes the shared open jornada and opens a fresh one.
test.describe("jornada", () => {
    for (const viewport of [
        { width: 320, height: 480 },
        { width: 360, height: 640 },
        { width: 1280, height: 720 },
    ]) {
        test(`keeps open-account details and close controls accessible at ${viewport.width}x${viewport.height}`, async ({ page }) => {
            test.setTimeout(120_000);
            const pool = new Pool({ connectionString: E2E_DATABASE_URL });
            let saleIds: number[] = [];
            try {
                const admin = (await pool.query<{ id: number }>(
                    "SELECT id FROM users WHERE email = $1 LIMIT 1", ["admin@e2e.local"]
                )).rows[0];
                const jornada = (await pool.query<{ id: number }>(
                    'SELECT id FROM jornada WHERE status = $1 ORDER BY "openedAt" DESC LIMIT 1', ["OPEN"]
                )).rows[0];
                const sources = [
                    ...Array.from({ length: 12 }, (_, index) => `VL-${101 + index}`),
                    "CL- ClienteConNombreLargoE2E",
                ];
                const sales = await pool.query<{ id: number }>(
                    `INSERT INTO sales (source_type, total, status, "placedBy", "jornadaId")
                     SELECT source_type, 25, 'UNPAID'::"SaleStatus", $2, $3
                     FROM unnest($1::text[]) AS sources(source_type) RETURNING id`,
                    [sources, admin.id, jornada.id]
                );
                saleIds = sales.rows.map(sale => sale.id);

                await page.setViewportSize(viewport);
                await page.goto("/admin/jornada");
                await page.getByRole("button", { name: "Cerrar jornada", exact: true }).click();
                const dialog = page.getByRole("alertdialog");
                const confirm = dialog.getByRole("button", { name: "Confirmar cierre", exact: true });
                const cancel = dialog.getByRole("button", { name: "Cancelar", exact: true });
                await dialog.getByLabel("Efectivo contado").fill("1000");
                await confirm.click();
                await expect(dialog.getByText("No se puede cerrar: hay cuentas abiertas sin cobrar.", { exact: true })).toBeVisible();
                await expect(dialog.getByRole("listitem")).toHaveCount(sources.length);

                const capture = async (name: string) => {
                    const path = test.info().outputPath(`${name}.png`);
                    await page.screenshot({ path });
                    await test.info().attach(name, { path, contentType: "image/png" });
                };
                await capture("open-accounts");
                await expect(dialog).toBeInViewport({ ratio: 1 });
                await expect(confirm).toBeInViewport({ ratio: 1 });
                await expect(cancel).toBeInViewport({ ratio: 1 });
                const box = await dialog.boundingBox();
                expect(box!.y).toBeGreaterThanOrEqual(15);
                expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height - 15);

                const content = dialog.getByRole("region", { name: "Contenido del cierre de jornada" });
                await expect(content.getByRole("button", { name: "Confirmar cierre", exact: true })).toHaveCount(0);
                const footerBox = await confirm.locator("..").boundingBox();
                const contentBox = await content.boundingBox();
                expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(footerBox!.y);
                const confirmBox = await confirm.boundingBox();
                const cancelBox = await cancel.boundingBox();
                await content.getByText(/^Resuelve cada cuenta en el POS/).scrollIntoViewIfNeeded();
                await expect.poll(() => content.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
                await expect(content.getByRole("listitem").last()).toBeInViewport({ ratio: 1 });
                await expect(content.getByText(/^Resuelve cada cuenta en el POS/)).toBeInViewport({ ratio: 1 });
                await expect(confirm).toBeInViewport({ ratio: 1 });
                await expect(cancel).toBeInViewport({ ratio: 1 });
                expect((await confirm.boundingBox())!.y).toBe(confirmBox!.y);
                expect((await cancel.boundingBox())!.y).toBe(cancelBox!.y);
                expect(await content.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
                await capture("open-accounts-scrolled");

                await cancel.click();
                await expect(dialog).toHaveCount(0);
                await expect(page.getByRole("button", { name: "Cerrar jornada", exact: true })).toBeVisible();
                expect((await pool.query<{ status: string }>(
                    "SELECT status FROM jornada WHERE id = $1", [jornada.id]
                )).rows[0].status).toBe("OPEN");
            } finally {
                if (saleIds.length > 0) await pool.query("DELETE FROM sales WHERE id = ANY($1::int[])", [saleIds]);
                await pool.end();
            }
        });
    }

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
