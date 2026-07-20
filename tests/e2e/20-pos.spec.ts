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

    test("cancelling a sale removes it from the recent orders list", async ({ page }) => {
        const rows = page.locator("tbody tr");
        const before = await rows.count();

        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expect(rows).toHaveCount(before + 1, { timeout: 15_000 });

        await page.getByRole("row").filter({ hasText: "Taco Pastor" }).first()
            .getByRole("button").nth(2).click();

        // The sale stays in the DB as CANCELLED but leaves today's list.
        await expect(rows).toHaveCount(before, { timeout: 15_000 });
    });

    test("closing a table returns to venta libre and clears its history", async ({ page }) => {
        const rows = page.locator("tbody tr");

        // A fresh table starts with an empty account view.
        await page.getByRole("button", { name: "3", exact: true }).click();
        await expect(rows).toHaveCount(0);

        // Order one product on the table: it shows as the open account.
        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        await expect(rows).toHaveCount(1, { timeout: 15_000 });

        // Close the table (pay the account).
        await page.getByRole("button", { name: /Cerrar Mesa/ }).click();
        await page.getByRole("button", { name: "Confirmar y Cerrar" }).click();

        // Reselecting the table shows a clean slate: its settled history is
        // gone from the POS, ready for the next customers.
        await page.getByRole("button", { name: "3", exact: true }).click();
        await expect(rows).toHaveCount(0, { timeout: 15_000 });
    });
});
