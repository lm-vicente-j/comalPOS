import { test, expect, type Page } from "@playwright/test";

// Every sale now lands in an account and waits there as UNPAID until it is
// charged, so each test settles what it opens: an unpaid leftover would make
// 90-jornada.spec.ts fail to close the shared jornada (OPEN_ACCOUNTS).
//
// The order list shows only the selected account: once the account is
// charged the list goes back to empty, so a settled sale never keeps showing
// its products as if it were still open. Wait for the account total and
// for the product buttons to finish their pending sale before the next tap;
// the optimistic total can appear before the "one sale in flight" guard clears.
//
// The suite runs in both projects. The desktop POS keeps the open account in
// the order table and charges every account kind from "Cerrar cuenta"; the
// mobile POS keeps it in a bottom sheet that opens from the account bar
// ("Abrir cuenta") and charges from the sheet's "Cobrar $…" button. The
// helpers below branch on the project so each test asserts the same behavior
// on both layouts.
test.describe("pos", () => {
    // Desktop: rows of the order table. Mobile: lines of the account sheet.
    const accountLines = (page: Page, isMobile: boolean) =>
        isMobile
            ? page.getByRole("dialog").getByRole("listitem")
            : page.locator("tbody tr");

    // Ticket chips read "#1 $25.00": number plus running total.
    const ticketChip = (page: Page, total: string) =>
        page.getByRole("button", { name: new RegExp(`^#\\d+\\s*\\$${total}$`) });

    // Asserts the running total of the walk-in ticket being served. Desktop
    // shows it on the selected ticket chip ("#1 $25.00"); mobile shows it on
    // the account bar (labelled "Abrir cuenta").
    const expectTicketTotal = async (page: Page, isMobile: boolean, total: string) => {
        if (isMobile) {
            await expect(page.getByRole("button", { name: "Abrir cuenta" }))
                .toContainText(`$${total}`, { timeout: 15_000 });
        } else {
            await expect(ticketChip(page, total.replace(".", "\\."))).toBeVisible({ timeout: 15_000 });
        }
        await expect(page.getByRole("button", { name: /Taco Pastor|Quesadilla Grande/ })
            .and(page.locator(":disabled"))).toHaveCount(0, { timeout: 15_000 });
    };

    const openAccountSheet = async (page: Page) => {
        await page.getByRole("button", { name: "Abrir cuenta" }).click();
    };

    const closeSheet = async (page: Page) => {
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
    };

    // Charges whatever account is open. Desktop goes through the shared
    // "Cerrar cuenta" dialog (tables, walk-ins and customers alike); mobile
    // opens the account sheet and confirms from there.
    const chargeAccount = async (page: Page, isMobile: boolean, total: string) => {
        if (isMobile) {
            if ((await page.getByRole("dialog").count()) === 0) await openAccountSheet(page);
            await expect(page.getByRole("dialog")).toContainText(total);
            await page.getByRole("dialog").getByRole("button", { name: /^Cobrar \$/ }).click();
            await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });
        } else {
            await page.getByRole("button", { name: /Cerrar cuenta/ }).click();
            await expect(page.getByRole("dialog")).toContainText(total);
            await page.getByRole("button", { name: "Confirmar y Cerrar" }).click();
            // The desktop dialog closes immediately; wait for the async
            // settlement to clear the selection before choosing another ticket.
            await expect(page.getByRole("button", { name: /Cerrar cuenta/ })).toBeDisabled({ timeout: 15_000 });
            await expect(accountLines(page, false)).toHaveCount(0, { timeout: 15_000 });
        }
    };

    test.beforeEach(async ({ page }) => {
        // createSale surfaces failures via alert(); never leave one hanging.
        page.on("dialog", (d) => d.dismiss().catch(() => {}));
        await page.goto("/pos");
    });

    test("a free sale opens a walk-in ticket and is charged from it", async ({ page }) => {
        const isMobile = test.info().project.name === "mobile";

        // No table and no customer selected: the tap opens a ticket by itself.
        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expectTicketTotal(page, isMobile, "25.00");

        if (isMobile) await openAccountSheet(page);
        await expect(accountLines(page, isMobile)).toHaveCount(1);

        await chargeAccount(page, isMobile, "$25.00");

        // Settled: no open ticket left, and the order list is clean again —
        // nothing of the charged ticket keeps showing as an open sale.
        await expect(ticketChip(page, "25\\.00")).toHaveCount(0, { timeout: 15_000 });
        if (isMobile) {
            // The bottom bar falls back to the jornada summary once nothing
            // is selected anymore.
            await expect(page.getByRole("button", { name: "Ver resumen de jornada" })).toBeVisible({ timeout: 15_000 });
        } else {
            await expect(accountLines(page, false)).toHaveCount(0, { timeout: 15_000 });
        }
    });

    test("a walk-in ticket adds up several products before charging", async ({ page }) => {
        const isMobile = test.info().project.name === "mobile";

        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expectTicketTotal(page, isMobile, "25.00");

        // 25 + 35: the running sum the walk-in customer has to pay, which the
        // free sale had no way of showing before.
        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        await expectTicketTotal(page, isMobile, "60.00");

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

        // First walk-in customer.
        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expectTicketTotal(page, isMobile, "25.00");
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
        await expectTicketTotal(page, isMobile, "35.00");

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
        await expectTicketTotal(page, isMobile, "25.00");
        await chargeAccount(page, isMobile, "$25.00");

        await expect(firstTicket).toHaveCount(0, { timeout: 15_000 });
    });

    test("the quantity buttons update the order line", async ({ page }) => {
        const isMobile = test.info().project.name === "mobile";

        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        await expectTicketTotal(page, isMobile, "35.00");

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

        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expectTicketTotal(page, isMobile, "25.00");

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

        // Close the table (pay the account) through the same "Cerrar cuenta"
        // dialog as every other account kind.
        await chargeAccount(page, isMobile, "$35.00");

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

    test("mobile cash calculator accepts decimals, warns on invalid values and follows the total", async ({ page }) => {
        test.skip(test.info().project.name !== "mobile", "Mobile-only cash calculator");
        const product = page.getByRole("button", { name: /Taco Pastor/ }).first();
        await product.click();
        await expectTicketTotal(page, true, "25.00");
        await openAccountSheet(page);

        const sheet = page.getByRole("dialog");
        const received = sheet.getByLabel("Efectivo recibido (opcional)");
        const change = sheet.locator("#mobile-cash-change");
        await expect(received).toHaveAttribute("inputmode", "decimal");
        await expect(received).toHaveValue("");
        for (const [value, result] of [
            ["", "Cambio a entregar: —"],
            ["25", "Cambio a entregar: $0.00"],
            ["30", "Cambio a entregar: $5.00"],
            ["24", "Faltan $1.00"],
            ["25.05", "Cambio a entregar: $0.05"],
            ["25,05", "Cambio a entregar: $0.05"],
            ["25.1", "Cambio a entregar: $0.10"],
            ["25,1", "Cambio a entregar: $0.10"],
            ["0", "Faltan $25.00"],
            [".50", "Faltan $24.50"],
            [" ,50 ", "Faltan $24.50"],
        ]) {
            await received.fill(value);
            await expect(change).toHaveText(result);
            await expect(received).toHaveAttribute("aria-invalid", "false");
            await expect(sheet.getByRole("alert")).toHaveCount(0);
            await expect(sheet.getByRole("button", { name: /^Cobrar \$/ })).toBeEnabled();
        }

        for (const value of ["abc", "-1", "25.001", "25,001", "25,0.1", "1e3", "Infinity", "90071992547409.92"]) {
            await received.fill(value);
            await expect(received).toHaveAttribute("aria-invalid", "true");
            await expect(sheet.getByRole("alert")).toContainText("hasta dos decimales");
            await expect(change).toHaveText("Cambio a entregar: —");
            await expect(sheet.getByRole("button", { name: /^Cobrar \$/ })).toBeEnabled();
        }

        await received.fill("50.05");
        await sheet.getByRole("button", { name: "Aumentar cantidad" }).click();
        await expect(sheet.getByRole("button", { name: "Cobrar $50.00", exact: true })).toBeVisible();
        await expect(change).toHaveText("Cambio a entregar: $0.05");
        await received.fill("inválido");
        await chargeAccount(page, true, "$50.00");

        await expect(product).toBeEnabled();
        await product.click();
        await expectTicketTotal(page, true, "25.00");
        await openAccountSheet(page);
        await expect(received).toHaveValue("");
        await expect(change).toHaveText("Cambio a entregar: —");
        await chargeAccount(page, true, "$25.00");
    });

    for (const [value, result] of [["", "Cambio a entregar: —"], ["1", "Faltan $24.00"]]) {
        test(`mobile cash remains informational when received is ${value === "" ? "empty" : "insufficient"}`, async ({ page }) => {
            test.skip(test.info().project.name !== "mobile", "Mobile-only cash calculator");
            await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
            await expectTicketTotal(page, true, "25.00");
            await openAccountSheet(page);
            const sheet = page.getByRole("dialog");
            await sheet.getByLabel("Efectivo recibido (opcional)").fill(value);
            await expect(sheet.locator("#mobile-cash-change")).toHaveText(result);
            await chargeAccount(page, true, "$25.00");
            await expect(page.getByRole("button", { name: "Ver resumen de jornada" })).toBeVisible();
        });
    }

    test("mobile cash resets on account and payment changes and hides for transfers", async ({ page }) => {
        test.skip(test.info().project.name !== "mobile", "Mobile-only cash calculator");
        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expectTicketTotal(page, true, "25.00");
        const firstTicket = ticketChip(page, "25\\.00");
        await openAccountSheet(page);
        const sheet = page.getByRole("dialog");
        const received = sheet.getByLabel("Efectivo recibido (opcional)");
        await received.fill("50");
        await closeSheet(page);

        await page.getByRole("button", { name: "Nuevo", exact: true }).click();
        await expect(ticketChip(page, "0\\.00")).toBeVisible();
        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        await expectTicketTotal(page, true, "35.00");
        const secondTicket = ticketChip(page, "35\\.00");
        await openAccountSheet(page);
        await expect(received).toHaveValue("");
        await received.fill("100");
        await sheet.getByRole("button", { name: "Transferencia", exact: true }).click();
        await expect(received).toHaveCount(0);
        await expect(sheet.locator("#mobile-cash-change")).toHaveCount(0);
        await expect(sheet.getByRole("button", { name: "Cobrar $35.00", exact: true })).toBeEnabled();
        await sheet.getByRole("button", { name: "Efectivo", exact: true }).click();
        await expect(received).toHaveValue("");
        await received.fill("100");
        await closeSheet(page);

        await firstTicket.click();
        await openAccountSheet(page);
        await expect(received).toHaveValue("");
        await chargeAccount(page, true, "$25.00");
        await secondTicket.click();
        await openAccountSheet(page);
        await expect(received).toHaveValue("");
        await sheet.getByRole("button", { name: "Transferencia", exact: true }).click();
        await chargeAccount(page, true, "$35.00");
        await expect(secondTicket).toHaveCount(0);
    });

    for (const viewport of [{ width: 320, height: 480 }, { width: 360, height: 640 }]) {
        test(`mobile charging stays visible with a long account at ${viewport.width}x${viewport.height}`, async ({ page }) => {
            test.skip(test.info().project.name !== "mobile", "Mobile-only fixed charging controls");
            test.setTimeout(120_000);
            await page.setViewportSize(viewport);
            const product = page.getByRole("button", { name: /Taco Pastor/ }).first();
            for (let i = 1; i <= 10; i++) {
                await expect(product).toBeEnabled();
                await product.click();
                await expectTicketTotal(page, true, (i * 25).toFixed(2));
            }

            const openAccount = page.getByRole("button", { name: "Abrir cuenta" });
            const charge = page.getByRole("button", { name: "Cobrar", exact: true });
            const nav = page.getByRole("navigation").filter({ has: page.getByRole("link", { name: "POS", exact: true }) });
            await expect(charge).toBeInViewport({ ratio: 1 });
            const barBox = await openAccount.locator("..").locator("..").boundingBox();
            const navBox = await nav.boundingBox();
            expect(barBox).not.toBeNull();
            expect(navBox).not.toBeNull();
            expect(barBox!.y + barBox!.height).toBeLessThanOrEqual(navBox!.y);
            const lastProduct = page.getByRole("button", { name: /Taco Pastor/ }).first();
            const catalog = lastProduct.locator("..").locator("..");
            // A card may be taller than the scroll area on a short screen.
            // Check the clipping boundary and the last card at the scroll end.
            await catalog.evaluate(element => { element.scrollTop = element.scrollHeight; });
            const catalogBox = await catalog.boundingBox();
            const productBox = await lastProduct.boundingBox();
            expect(catalogBox!.y + catalogBox!.height).toBeLessThanOrEqual(barBox!.y);
            expect(productBox!.y + productBox!.height).toBeLessThanOrEqual(catalogBox!.y + catalogBox!.height);
            await expect(lastProduct).toBeInViewport();
            await expect(charge).toBeInViewport({ ratio: 1 });
            await test.info().attach("catalog-and-fixed-charge", { body: await page.screenshot(), contentType: "image/png" });

            await charge.click();
            const sheet = page.getByRole("dialog");
            const content = sheet.getByRole("region", { name: "Contenido de la cuenta" });
            const confirm = sheet.getByRole("button", { name: "Cobrar $250.00", exact: true });
            await expect(accountLines(page, true)).toHaveCount(10);
            await expect(confirm).toBeInViewport({ ratio: 1 });
            await expect(content.getByText("Total", { exact: true })).toHaveCount(0);
            await expect(content.getByRole("button", { name: /^Cobrar \$/ })).toHaveCount(0);
            const received = sheet.getByLabel("Efectivo recibido (opcional)");
            await expect(received).toBeInViewport({ ratio: 1 });
            await received.fill("250,05");
            await expect(sheet.locator("#mobile-cash-change")).toHaveText("Cambio a entregar: $0.05");
            await expect.poll(async () => {
                const box = await confirm.boundingBox();
                return box ? Math.round(box.y + box.height) : -1;
            }).toBe(viewport.height - 24);
            const confirmBox = await confirm.boundingBox();
            const contentBox = await content.boundingBox();
            const receivedBox = await received.boundingBox();
            const firstLineBox = await accountLines(page, true).first().boundingBox();
            expect(receivedBox!.y + receivedBox!.height).toBeLessThanOrEqual(firstLineBox!.y);
            const footerBox = await confirm.locator("..").boundingBox();
            expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(footerBox!.y);
            await test.info().attach("payment-and-fixed-confirmation", { body: await page.screenshot(), contentType: "image/png" });

            await content.getByRole("button", { name: "Salir de la cuenta", exact: true }).scrollIntoViewIfNeeded();
            await expect.poll(() => content.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
            await expect(confirm).toBeInViewport({ ratio: 1 });
            expect((await confirm.boundingBox())!.y).toBe(confirmBox!.y);
            await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
            await test.info().attach("long-account-scrolled", { body: await page.screenshot(), contentType: "image/png" });
            await confirm.click();
            await expect(sheet).toHaveCount(0, { timeout: 15_000 });
        });
    }
});
