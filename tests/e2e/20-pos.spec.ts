import { test, expect, type Page } from "@playwright/test";

// Every sale now lands in an account and waits there as UNPAID until it is
// charged, so each test settles what it opens: an unpaid leftover would make
// 90-jornada.spec.ts fail to close the shared jornada (OPEN_ACCOUNTS).
//
// Taps are awaited on the account total rather than on a row count: the free
// sale view already holds the sales charged by earlier tests, so a count can
// match before the new sale exists and the next tap would then be dropped by
// the "one sale in flight" guard.
//
// The suite runs in both projects. The desktop POS keeps the open account in
// the order table and charges from "Cobrar Ticket" / "Cerrar Mesa"; the
// mobile POS keeps it in a bottom sheet that opens from the account bar
// ("Abrir cuenta") and charges from the sheet's "Cobrar $…" button. The
// helpers below branch on the project so each test asserts the same behavior
// on both layouts.
test.describe("pos", () => {
    // Desktop: "Cobrar Ticket #1 — $25.00" for the ticket being served.
    // Mobile: the account bar (labelled "Abrir cuenta") shows the same
    // ticket and its running total.
    const accountBar = (page: Page, isMobile: boolean) =>
        isMobile
            ? page.getByRole("button", { name: "Abrir cuenta" })
            : page.getByRole("button", { name: /Cobrar Ticket/ });

    // Desktop: rows of the order table. Mobile: lines of the account sheet.
    const accountLines = (page: Page, isMobile: boolean) =>
        isMobile
            ? page.getByRole("dialog").getByRole("listitem")
            : page.locator("tbody tr");

    // Ticket chips read "#1 $25.00": number plus running total.
    const ticketChip = (page: Page, total: string) =>
        page.getByRole("button", { name: new RegExp(`^#\\d+\\s*\\$${total}$`) });

    const openAccountSheet = async (page: Page) => {
        await page.getByRole("button", { name: "Abrir cuenta" }).click();
    };

    const closeSheet = async (page: Page) => {
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
    };

    // Charges whatever account is open. Desktop goes through the charge
    // dialog ("Cobrar Ticket" for walk-ins, "Cerrar Mesa" for tables);
    // mobile opens the account sheet and confirms from there.
    const chargeAccount = async (page: Page, isMobile: boolean, total: string, ticket = true) => {
        if (isMobile) {
            if ((await page.getByRole("dialog").count()) === 0) await openAccountSheet(page);
            await expect(page.getByRole("dialog")).toContainText(total);
            await page.getByRole("dialog").getByRole("button", { name: /^Cobrar \$/ }).click();
            await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });
        } else {
            await page.getByRole("button", { name: ticket ? /Cobrar Ticket/ : /Cerrar Mesa/ }).click();
            await expect(page.getByRole("dialog")).toContainText(total);
            await page.getByRole("button", { name: "Confirmar y Cerrar" }).click();
        }
    };

    test.beforeEach(async ({ page }) => {
        // createSale surfaces failures via alert(); never leave one hanging.
        page.on("dialog", (d) => d.dismiss().catch(() => {}));
        await page.goto("/pos");
    });

    test("a free sale opens a walk-in ticket and is charged from it", async ({ page }) => {
        const isMobile = test.info().project.name === "mobile";
        const bar = accountBar(page, isMobile);

        // No table and no customer selected: the tap opens a ticket by itself.
        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expect(bar).toContainText("$25.00", { timeout: 15_000 });

        if (isMobile) await openAccountSheet(page);
        await expect(accountLines(page, isMobile)).toHaveCount(1);

        await chargeAccount(page, isMobile, "$25.00");

        // Settled: no open ticket left, and the sale joins the free sale history.
        await expect(ticketChip(page, "25\\.00")).toHaveCount(0, { timeout: 15_000 });
        if (isMobile) {
            await page.getByRole("button", { name: "Ver pedidos de hoy" }).click();
            await expect(page.getByRole("dialog")).toContainText("Taco Pastor");
        } else {
            await expect(page.locator("tbody tr").filter({ hasText: "Taco Pastor" })).not.toHaveCount(0);
        }
    });

    test("a walk-in ticket adds up several products before charging", async ({ page }) => {
        const isMobile = test.info().project.name === "mobile";
        const bar = accountBar(page, isMobile);

        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expect(bar).toContainText("$25.00", { timeout: 15_000 });

        // 25 + 35: the running sum the walk-in customer has to pay, which the
        // free sale had no way of showing before.
        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        await expect(bar).toContainText("$60.00", { timeout: 15_000 });

        if (isMobile) {
            await openAccountSheet(page);
            await expect(accountLines(page, true)).toHaveCount(2);
        } else {
            await expect(accountLines(page, false)).toHaveCount(2);
        }

        await chargeAccount(page, isMobile, "$60.00");
        await expect(ticketChip(page, "60\\.00")).toHaveCount(0, { timeout: 15_000 });
    });

    test("keeps two walk-in tickets open at the same time", async ({ page }) => {
        const isMobile = test.info().project.name === "mobile";
        const bar = accountBar(page, isMobile);

        // First walk-in customer.
        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expect(bar).toContainText("$25.00", { timeout: 15_000 });
        const firstTicket = ticketChip(page, "25\\.00");

        // A second one starts ordering before the first has paid.
        await page.getByRole("button", { name: "Nuevo", exact: true }).click();
        await expect(ticketChip(page, "0\\.00")).toBeVisible({ timeout: 15_000 });

        if (isMobile) {
            await openAccountSheet(page);
            await expect(accountLines(page, true)).toHaveCount(0);
            await closeSheet(page);
        } else {
            await expect(accountLines(page, false)).toHaveCount(0);
        }

        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        await expect(bar).toContainText("$35.00", { timeout: 15_000 });

        // Each ticket keeps its own total: the first one is untouched.
        if (isMobile) {
            await openAccountSheet(page);
            await expect(accountLines(page, true)).toHaveCount(1);
            await closeSheet(page);
        } else {
            await expect(accountLines(page, false)).toHaveCount(1);
        }
        await expect(firstTicket).toBeVisible();

        // Charging the second one doesn't settle the first.
        await chargeAccount(page, isMobile, "$35.00");
        await expect(firstTicket).toBeVisible({ timeout: 15_000 });

        // Back to the first customer, who now pays too.
        await firstTicket.click();
        await expect(bar).toContainText("$25.00", { timeout: 15_000 });
        await chargeAccount(page, isMobile, "$25.00");

        await expect(firstTicket).toHaveCount(0, { timeout: 15_000 });
    });

    test("the quantity buttons update the order line", async ({ page }) => {
        const isMobile = test.info().project.name === "mobile";
        const bar = accountBar(page, isMobile);

        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        await expect(bar).toContainText("$35.00", { timeout: 15_000 });

        if (isMobile) {
            // Stepper buttons carry explicit labels on the phone; the line's
            // subtotal is what proves the update landed.
            await openAccountSheet(page);
            const line = page.getByRole("dialog").getByRole("listitem").first();
            await line.getByRole("button", { name: "Aumentar cantidad" }).click();
            await expect(line).toContainText("$70.00", { timeout: 15_000 });
            await line.getByRole("button", { name: "Reducir cantidad" }).click();
            await expect(line).toContainText("$35.00", { timeout: 15_000 });
        } else {
            // Buttons in the row: [0] plus, [1] minus, [2] cancel.
            const row = page.locator("tbody tr").first();
            await row.getByRole("button").nth(0).click();
            await expect(row.getByRole("cell", { name: "2", exact: true })).toBeVisible();

            await row.getByRole("button").nth(1).click();
            await expect(row.getByRole("cell", { name: "1", exact: true })).toBeVisible();
        }

        await chargeAccount(page, isMobile, "$35.00");
        await expect(ticketChip(page, "35\\.00")).toHaveCount(0, { timeout: 15_000 });
    });

    test("cancelling a sale removes it from the recent orders list", async ({ page }) => {
        const isMobile = test.info().project.name === "mobile";
        const bar = accountBar(page, isMobile);

        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expect(bar).toContainText("$25.00", { timeout: 15_000 });

        if (isMobile) {
            await openAccountSheet(page);
            const lines = accountLines(page, true);
            await expect(lines).toHaveCount(1);
            await lines.first().getByRole("button", { name: "Eliminar línea" }).click();
        } else {
            const rows = accountLines(page, false);
            await expect(rows).toHaveCount(1);
            await rows.first().getByRole("button").nth(2).click();
        }

        // The sale stays in the DB as CANCELLED but leaves the ticket, which
        // is left empty and so has nothing to charge.
        await expect(accountLines(page, isMobile)).toHaveCount(0, { timeout: 15_000 });
    });

    test("closing a table returns to venta libre and clears its history", async ({ page }) => {
        const isMobile = test.info().project.name === "mobile";

        // On the phone the tables live behind their own tab.
        if (isMobile) await page.getByRole("button", { name: "Mesas", exact: true }).click();

        // A fresh table starts with an empty account view.
        await page.getByRole("button", { name: "3", exact: true }).click();
        if (isMobile) {
            await openAccountSheet(page);
            await expect(accountLines(page, true)).toHaveCount(0);
            await closeSheet(page);
        } else {
            await expect(accountLines(page, false)).toHaveCount(0);
        }

        // Order one product on the table: it shows as the open account.
        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        if (isMobile) {
            await openAccountSheet(page);
            await expect(accountLines(page, true)).toHaveCount(1, { timeout: 15_000 });
        } else {
            await expect(accountLines(page, false)).toHaveCount(1, { timeout: 15_000 });
        }

        // Close the table (pay the account).
        await chargeAccount(page, isMobile, "$35.00", false);

        // Reselecting the table shows a clean slate: its settled history is
        // gone from the POS, ready for the next customers.
        if (isMobile) await page.getByRole("button", { name: "Mesas", exact: true }).click();
        await page.getByRole("button", { name: "3", exact: true }).click();
        if (isMobile) {
            await openAccountSheet(page);
            await expect(accountLines(page, true)).toHaveCount(0, { timeout: 15_000 });
        } else {
            await expect(accountLines(page, false)).toHaveCount(0, { timeout: 15_000 });
        }
    });
});
