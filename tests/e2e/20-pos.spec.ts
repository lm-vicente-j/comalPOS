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

    const openCashDialog = async (page: Page) => {
        const sheet = page.getByRole("dialog", { name: /^Cuenta/ });
        await sheet.getByRole("button", { name: /^Cobrar \$/ }).click();
        const cashDialog = page.getByRole("dialog", { name: "Cobrar en efectivo", exact: true });
        await expect(cashDialog).toBeVisible();
        await expect(sheet).toHaveCount(0);
        return cashDialog;
    };

    const closeSheet = async (page: Page) => {
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
    };

    // Charges whatever account is open. Desktop goes through the shared
    // "Cerrar cuenta" dialog (tables, walk-ins and customers alike); mobile
    // opens the account sheet, then confirms cash in its required-amount dialog.
    const chargeAccount = async (page: Page, isMobile: boolean, total: string) => {
        if (isMobile) {
            const cashDialog = page.getByRole("dialog", { name: "Cobrar en efectivo", exact: true });
            if ((await cashDialog.count()) === 0) {
                if ((await page.getByRole("dialog").count()) === 0) await openAccountSheet(page);
                const sheet = page.getByRole("dialog", { name: /^Cuenta/ });
                await expect(sheet).toContainText(total);
                const isCash = await sheet.getByRole("button", { name: "Efectivo", exact: true }).getAttribute("aria-pressed") === "true";
                await sheet.getByRole("button", { name: /^Cobrar \$/ }).click();
                if (isCash) await expect(cashDialog).toBeVisible();
            }
            if ((await cashDialog.count()) > 0) {
                await cashDialog.getByLabel("Efectivo recibido", { exact: true }).fill(total.replace("$", ""));
                await cashDialog.getByRole("button", { name: /^Cobrar \$/ }).click();
            }
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


    test("mobile cash requires clicking charge and Enter only dismisses the keyboard", async ({ page }) => {
        test.skip(test.info().project.name !== "mobile", "Mobile-only cash dialog");
        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expectTicketTotal(page, true, "25.00");
        await openAccountSheet(page);
        const cashDialog = await openCashDialog(page);
        const received = cashDialog.getByLabel("Efectivo recibido", { exact: true });
        const confirm = cashDialog.getByRole("button", { name: "Cobrar $25.00", exact: true });
        await expect(received).toHaveAttribute("enterkeyhint", "done");

        for (const value of ["25", "50"]) {
            await received.fill(value);
            await expect(received).toBeFocused();
            await expect(confirm).toBeEnabled();
            const unexpectedPost = page.waitForRequest(
                request => request.method() === "POST" && new URL(request.url()).pathname === "/pos",
                { timeout: 1_500 }
            ).then(() => true, () => false);
            await received.press("Enter");
            await expect(received).not.toBeFocused();
            expect(await unexpectedPost).toBe(false);
            await expect(cashDialog).toBeVisible();
            await expect(received).toHaveValue(value);
            await expect(confirm).toBeEnabled();
        }

        const chargeRequest = page.waitForRequest(
            request => request.method() === "POST" && new URL(request.url()).pathname === "/pos"
        );
        await confirm.click();
        await chargeRequest;
        await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });
        await expect(page.getByRole("button", { name: "Ver resumen de jornada" })).toBeVisible();
    });

    test("mobile cash dialog requires a valid sufficient amount and accepts decimals", async ({ page }) => {
        test.skip(test.info().project.name !== "mobile", "Mobile-only cash dialog");
        const product = page.getByRole("button", { name: /Taco Pastor/ }).first();
        await product.click();
        await expectTicketTotal(page, true, "25.00");
        await openAccountSheet(page);

        const sheet = page.getByRole("dialog", { name: /^Cuenta/ });
        await expect(sheet.getByLabel("Efectivo recibido", { exact: true })).toHaveCount(0);
        const cashDialog = await openCashDialog(page);
        const received = cashDialog.getByLabel("Efectivo recibido", { exact: true });
        const change = cashDialog.locator("#mobile-cash-change");
        const confirm = cashDialog.getByRole("button", { name: /^Cobrar \$/ });
        await expect(received).toHaveAttribute("inputmode", "decimal");
        await expect(received).toHaveJSProperty("required", true);
        await expect(received).toBeFocused();
        await expect(received).toHaveValue("");
        for (const [value, result, canCharge] of [
            ["", "Cambio a entregar: —", false],
            ["25", "Cambio a entregar: $0.00", true],
            ["30", "Cambio a entregar: $5.00", true],
            ["24", "Faltan $1.00", false],
            ["25.05", "Cambio a entregar: $0.05", true],
            ["25,05", "Cambio a entregar: $0.05", true],
            ["25.1", "Cambio a entregar: $0.10", true],
            ["25,1", "Cambio a entregar: $0.10", true],
            ["0", "Faltan $25.00", false],
            [".50", "Faltan $24.50", false],
            [" ,50 ", "Faltan $24.50", false],
            ["   ", "Cambio a entregar: —", false],
        ] as const) {
            await received.fill(value);
            await expect(change).toHaveText(result);
            await expect(received).toHaveAttribute("aria-invalid", "false");
            await expect(cashDialog.getByRole("alert")).toHaveCount(0);
            if (canCharge) await expect(confirm).toBeEnabled();
            else await expect(confirm).toBeDisabled();
        }

        for (const value of ["abc", "-1", "25.001", "25,001", "25,0.1", "1e3", "Infinity", "90071992547409.92"]) {
            await received.fill(value);
            await expect(received).toHaveAttribute("aria-invalid", "true");
            await expect(cashDialog.getByRole("alert")).toContainText("hasta dos decimales");
            await expect(change).toHaveText("Cambio a entregar: —");
            await expect(confirm).toBeDisabled();
        }
        await received.press("Enter");
        await expect(received).not.toBeFocused();
        await expect(cashDialog).toBeVisible();

        // Cancelling returns to the same account; its changed total is used
        // when the cash dialog is opened again.
        await received.fill("50.05");
        await page.keyboard.press("Escape");
        await expect(cashDialog).toHaveCount(0);
        await expect(sheet).toBeVisible();
        await expect(sheet.getByLabel("Efectivo recibido", { exact: true })).toHaveCount(0);
        await sheet.getByRole("button", { name: "Aumentar cantidad" }).click();
        await expect(sheet.getByRole("button", { name: "Cobrar $50.00", exact: true })).toBeVisible();
        await openCashDialog(page);
        await expect(received).toHaveValue("50.05");
        await expect(change).toHaveText("Cambio a entregar: $0.05");
        await confirm.click();
        await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });

        await expect(product).toBeEnabled();
        await product.click();
        await expectTicketTotal(page, true, "25.00");
        await openAccountSheet(page);
        await openCashDialog(page);
        await expect(received).toHaveValue("");
        await expect(change).toHaveText("Cambio a entregar: —");
        await expect(confirm).toBeDisabled();
        await chargeAccount(page, true, "$25.00");
    });

    for (const [value, result] of [["", "Cambio a entregar: —"], ["1", "Faltan $24.00"]]) {
        test(`mobile cash blocks charging when received is ${value === "" ? "empty" : "insufficient"}`, async ({ page }) => {
            test.skip(test.info().project.name !== "mobile", "Mobile-only cash dialog");
            await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
            await expectTicketTotal(page, true, "25.00");
            await openAccountSheet(page);
            const cashDialog = await openCashDialog(page);
            const received = cashDialog.getByLabel("Efectivo recibido", { exact: true });
            await received.fill(value);
            await expect(cashDialog.locator("#mobile-cash-change")).toHaveText(result);
            await expect(cashDialog.getByRole("button", { name: /^Cobrar \$/ })).toBeDisabled();
            await received.press("Enter");
            await expect(received).not.toBeFocused();
            await expect(cashDialog).toBeVisible();
            await chargeAccount(page, true, "$25.00");
            await expect(page.getByRole("button", { name: "Ver resumen de jornada" })).toBeVisible();
        });
    }

    test("mobile cash resets on account and payment changes and transfers charge without the cash dialog", async ({ page }) => {
        test.skip(test.info().project.name !== "mobile", "Mobile-only cash dialog");
        await page.getByRole("button", { name: /Taco Pastor/ }).first().click();
        await expectTicketTotal(page, true, "25.00");
        const firstTicket = ticketChip(page, "25\\.00");
        await openAccountSheet(page);
        const sheet = page.getByRole("dialog", { name: /^Cuenta/ });
        const cashDialog = await openCashDialog(page);
        const received = cashDialog.getByLabel("Efectivo recibido", { exact: true });
        const back = cashDialog.getByRole("button", { name: "Volver a la cuenta", exact: true });
        await received.fill("50");
        await back.click();
        await expect(cashDialog).toHaveCount(0);
        await expect(sheet).toBeVisible();
        await closeSheet(page);

        await page.getByRole("button", { name: "Nuevo", exact: true }).click();
        await expect(ticketChip(page, "0\\.00")).toBeVisible();
        await page.getByRole("button", { name: /Quesadilla Grande/ }).first().click();
        await expectTicketTotal(page, true, "35.00");
        const secondTicket = ticketChip(page, "35\\.00");
        await openAccountSheet(page);
        await openCashDialog(page);
        await expect(received).toHaveValue("");
        await received.fill("100");
        await back.click();
        await expect(sheet).toBeVisible();
        await sheet.getByRole("button", { name: "Transferencia", exact: true }).click();
        await expect(sheet.getByLabel("Efectivo recibido", { exact: true })).toHaveCount(0);
        await sheet.getByRole("button", { name: "Efectivo", exact: true }).click();
        await openCashDialog(page);
        await expect(received).toHaveValue("");
        await received.fill("100");
        await back.click();
        await expect(sheet).toBeVisible();
        await closeSheet(page);

        await firstTicket.click();
        await openAccountSheet(page);
        await openCashDialog(page);
        await expect(received).toHaveValue("");
        await chargeAccount(page, true, "$25.00");
        await secondTicket.click();
        await openAccountSheet(page);
        await openCashDialog(page);
        await expect(received).toHaveValue("");
        await back.click();
        await expect(sheet).toBeVisible();
        await sheet.getByRole("button", { name: "Transferencia", exact: true }).click();
        await chargeAccount(page, true, "$35.00");
        await expect(cashDialog).toHaveCount(0);
        await expect(secondTicket).toHaveCount(0);
    });

    for (const viewport of [{ width: 320, height: 480 }, { width: 360, height: 640 }]) {
        test(`mobile charging stays visible with a long account at ${viewport.width}x${viewport.height}`, async ({ page }) => {
            test.skip(test.info().project.name !== "mobile", "Mobile-only fixed charging controls");
            test.setTimeout(120_000);
            await page.setViewportSize(viewport);
            const capture = async (name: string) => {
                const path = test.info().outputPath(`${name}.png`);
                await page.screenshot({ path });
                await test.info().attach(name, { path, contentType: "image/png" });
            };
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
            const catalog = product.locator("..").locator("..");
            await catalog.evaluate(element => { element.scrollTop = element.scrollHeight; });
            const catalogBox = await catalog.boundingBox();
            const productBox = await product.boundingBox();
            expect(catalogBox!.y + catalogBox!.height).toBeLessThanOrEqual(barBox!.y);
            expect(productBox!.y + productBox!.height).toBeLessThanOrEqual(catalogBox!.y + catalogBox!.height);
            await expect(product).toBeInViewport();
            await capture("catalog-and-fixed-charge");

            // The bottom bar still opens the summary, with no cash field.
            await charge.click();
            const sheet = page.getByRole("dialog", { name: /^Cuenta/ });
            const content = sheet.getByRole("region", { name: "Contenido de la cuenta" });
            const confirm = sheet.getByRole("button", { name: "Cobrar $250.00", exact: true });
            await expect(accountLines(page, true)).toHaveCount(10);
            await expect(confirm).toBeInViewport({ ratio: 1 });
            await expect(confirm).toBeEnabled();
            await expect(sheet.getByLabel("Efectivo recibido", { exact: true })).toHaveCount(0);
            await expect(content.getByText("Total", { exact: true })).toHaveCount(0);
            await expect(content.getByRole("button", { name: /^Cobrar \$/ })).toHaveCount(0);
            await expect(content.getByRole("button", { name: "Efectivo", exact: true })).toBeInViewport({ ratio: 1 });
            await expect.poll(async () => {
                const box = await confirm.boundingBox();
                return box ? Math.round(box.y + box.height) : -1;
            }).toBe(viewport.height - 24);
            const confirmBox = await confirm.boundingBox();
            const contentBox = await content.boundingBox();
            const methodBox = await content.getByRole("button", { name: "Efectivo", exact: true }).boundingBox();
            const firstLineBox = await accountLines(page, true).first().boundingBox();
            const footerBox = await confirm.locator("..").boundingBox();
            expect(methodBox!.y + methodBox!.height).toBeLessThanOrEqual(firstLineBox!.y);
            expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(footerBox!.y);
            await capture("account-summary");

            await content.getByRole("button", { name: "Salir de la cuenta", exact: true }).scrollIntoViewIfNeeded();
            await expect.poll(() => content.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
            await expect(confirm).toBeInViewport({ ratio: 1 });
            expect((await confirm.boundingBox())!.y).toBe(confirmBox!.y);
            await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
            await capture("long-account-scrolled");

            // Only the summary's charge button opens the separate cash dialog.
            const cashDialog = await openCashDialog(page);
            await expect(accountLines(page, true)).toHaveCount(0);
            const received = cashDialog.getByLabel("Efectivo recibido", { exact: true });
            const cashConfirm = cashDialog.getByRole("button", { name: "Cobrar $250.00", exact: true });
            await expect(received).toBeInViewport({ ratio: 1 });
            await expect(received).toHaveJSProperty("required", true);
            await expect(cashConfirm).toBeInViewport({ ratio: 1 });
            await expect(cashConfirm).toBeDisabled();
            await received.fill("250.001");
            await cashDialog.getByRole("alert").scrollIntoViewIfNeeded();
            await expect(cashDialog.getByRole("alert")).toBeInViewport({ ratio: 1 });
            await expect(cashConfirm).toBeInViewport({ ratio: 1 });
            await expect(cashConfirm).toBeDisabled();
            await capture("cash-dialog-invalid");
            await received.fill("250,05");
            await expect(cashDialog.locator("#mobile-cash-change")).toHaveText("Cambio a entregar: $0.05");
            await expect(cashConfirm).toBeEnabled();
            await expect(cashConfirm).toBeInViewport({ ratio: 1 });
            await expect(cashDialog.getByRole("button", { name: "Volver a la cuenta", exact: true })).toBeInViewport({ ratio: 1 });
            await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
            await capture("cash-dialog-valid");
            await cashConfirm.click();
            await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });
        });
    }
});
