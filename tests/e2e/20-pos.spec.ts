import { test, expect } from "@playwright/test";

test.describe("pos", () => {
    test.beforeEach(async ({ page }) => {
        // createSale surfaces failures via alert(); never leave one hanging.
        page.on("dialog", (d) => d.dismiss().catch(() => {}));
        await page.goto("/pos");
    });

    test("a free sale is registered with one tap on a product", async ({ page }) => {
        const rows = page.locator("tbody tr");
        const before = await rows.count();

        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();

        await expect.poll(async () => rows.count(), { timeout: 15_000 }).toBeGreaterThan(before);
    });

    test("the quantity buttons update the order line", async ({ page }) => {
        const quesadillaRows = page.getByRole("row").filter({ hasText: "Quesadilla Grande" });
        const before = await quesadillaRows.count();

        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        // Wait until OUR sale shows up (newest first) before touching a row,
        // otherwise the buttons of an older sale would be clicked.
        await expect(quesadillaRows).toHaveCount(before + 1, { timeout: 15_000 });

        // Buttons in the row: [0] plus, [1] minus, [2] cancel.
        const row = quesadillaRows.first();
        await row.getByRole("button").nth(0).click();
        await expect(row.getByRole("cell", { name: "2", exact: true })).toBeVisible();

        await row.getByRole("button").nth(1).click();
        await expect(row.getByRole("cell", { name: "1", exact: true })).toBeVisible();
    });

    test("cancelling a sale keeps it listed for the day", async ({ page }) => {
        const rows = page.locator("tbody tr");
        const before = await rows.count();

        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expect(rows).toHaveCount(before + 1, { timeout: 15_000 });

        const afterCreate = await rows.count();
        await page.getByRole("row").filter({ hasText: "Taco Pastor" }).first()
            .getByRole("button").nth(2).click();

        // The sale is cancelled server-side but stays in today's list.
        await page.waitForTimeout(1500);
        expect(await rows.count()).toBe(afterCreate);
    });
});
