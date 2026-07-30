import { test, expect } from "@playwright/test";

// Every sale now lands in an account and waits there as UNPAID until it is
// charged, so each test settles what it opens: an unpaid leftover would make
// 90-jornada.spec.ts fail to close the shared jornada (OPEN_ACCOUNTS).
//
// Taps are awaited on the ticket total rather than on a row count: the free
// sale view already holds the sales charged by earlier tests, so a count can
// match before the new sale exists and the next tap would then be dropped by
// the "one sale in flight" guard.
test.describe("pos", () => {
    // "Cobrar Ticket #1 — $25.00" for the ticket being served.
    const chargeButton = (page: import("@playwright/test").Page) =>
        page.getByRole("button", { name: /Cobrar Ticket/ });

    // Ticket chips read "#1 $25.00": number plus running total.
    const ticketChip = (page: import("@playwright/test").Page, total: string) =>
        page.getByRole("button", { name: new RegExp(`^#\\d+\\s*\\$${total}$`) });

    test.beforeEach(async ({ page }) => {
        // createSale surfaces failures via alert(); never leave one hanging.
        page.on("dialog", (d) => d.dismiss().catch(() => {}));
        await page.goto("/pos");
    });

    test("a free sale opens a walk-in ticket and is charged from it", async ({ page }) => {
        const rows = page.locator("tbody tr");
        const charge = chargeButton(page);

        // No table and no customer selected: the tap opens a ticket by itself.
        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expect(charge).toContainText("$25.00", { timeout: 15_000 });
        await expect(rows).toHaveCount(1);

        await charge.click();
        await page.getByRole("button", { name: "Confirmar y Cerrar" }).click();

        // Settled: no open ticket left, and the sale joins the free sale history.
        await expect(ticketChip(page, "25\\.00")).toHaveCount(0, { timeout: 15_000 });
        await expect(rows.filter({ hasText: "Taco Pastor" })).not.toHaveCount(0);
    });

    test("a walk-in ticket adds up several products before charging", async ({ page }) => {
        const charge = chargeButton(page);

        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expect(charge).toContainText("$25.00", { timeout: 15_000 });

        // 25 + 35: the running sum the walk-in customer has to pay, which the
        // free sale had no way of showing before.
        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        await expect(charge).toContainText("$60.00", { timeout: 15_000 });
        await expect(page.locator("tbody tr")).toHaveCount(2);

        await charge.click();
        await expect(page.getByRole("dialog")).toContainText("$60.00");
        await page.getByRole("button", { name: "Confirmar y Cerrar" }).click();

        await expect(ticketChip(page, "60\\.00")).toHaveCount(0, { timeout: 15_000 });
    });

    test("keeps two walk-in tickets open at the same time", async ({ page }) => {
        const rows = page.locator("tbody tr");
        const charge = chargeButton(page);

        // First walk-in customer.
        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expect(charge).toContainText("$25.00", { timeout: 15_000 });
        const firstTicket = ticketChip(page, "25\\.00");

        // A second one starts ordering before the first has paid.
        await page.getByRole("button", { name: "Nuevo", exact: true }).click();
        await expect(ticketChip(page, "0\\.00")).toBeVisible({ timeout: 15_000 });
        await expect(rows).toHaveCount(0);

        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        await expect(charge).toContainText("$35.00", { timeout: 15_000 });

        // Each ticket keeps its own total: the first one is untouched.
        await expect(rows).toHaveCount(1);
        await expect(firstTicket).toBeVisible();

        // Charging the second one doesn't settle the first.
        await charge.click();
        await page.getByRole("button", { name: "Confirmar y Cerrar" }).click();
        await expect(firstTicket).toBeVisible({ timeout: 15_000 });

        // Back to the first customer, who now pays too.
        await firstTicket.click();
        await expect(charge).toContainText("$25.00", { timeout: 15_000 });
        await charge.click();
        await page.getByRole("button", { name: "Confirmar y Cerrar" }).click();

        await expect(firstTicket).toHaveCount(0, { timeout: 15_000 });
    });

    test("the quantity buttons update the order line", async ({ page }) => {
        const charge = chargeButton(page);

        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        await expect(charge).toContainText("$35.00", { timeout: 15_000 });

        // Buttons in the row: [0] plus, [1] minus, [2] cancel.
        const row = page.locator("tbody tr").first();
        await row.getByRole("button").nth(0).click();
        await expect(row.getByRole("cell", { name: "2", exact: true })).toBeVisible();

        await row.getByRole("button").nth(1).click();
        await expect(row.getByRole("cell", { name: "1", exact: true })).toBeVisible();

        await charge.click();
        await page.getByRole("button", { name: "Confirmar y Cerrar" }).click();
        await expect(ticketChip(page, "35\\.00")).toHaveCount(0, { timeout: 15_000 });
    });

    test("cancelling a sale removes it from the recent orders list", async ({ page }) => {
        const rows = page.locator("tbody tr");

        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expect(chargeButton(page)).toContainText("$25.00", { timeout: 15_000 });
        await expect(rows).toHaveCount(1);

        await rows.first().getByRole("button").nth(2).click();

        // The sale stays in the DB as CANCELLED but leaves the ticket, which
        // is left empty and so has nothing to charge.
        await expect(rows).toHaveCount(0, { timeout: 15_000 });
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
