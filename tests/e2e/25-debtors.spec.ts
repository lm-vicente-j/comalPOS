import { test, expect, type Page, type Request } from "@playwright/test";
import { Pool } from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";

type DebtFixture = { customerId: number; saleId: number; name: string };

async function createDebt(pool: Pool, name: string, amount: string): Promise<DebtFixture> {
    const admin = (await pool.query<{ id: number }>(
        "SELECT id FROM users WHERE email = $1 LIMIT 1", ["admin@e2e.local"]
    )).rows[0];
    const customer = (await pool.query<{ id: number }>(
        'INSERT INTO customer ("customerName", alias, "currentBalance", "registeredDate") VALUES ($1, $2, $3, CURRENT_DATE) RETURNING id',
        [name, "deuda-e2e", amount]
    )).rows[0];
    const sale = (await pool.query<{ id: number }>(
        'INSERT INTO sales (total, source_type, "customerID", "placedBy", status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [amount, "CL- Deuda E2E", customer.id, admin.id, "DEBT"]
    )).rows[0];
    await pool.query(
        'INSERT INTO debtors ("saleID", "customerID", amount, status) VALUES ($1, $2, $3, $4)',
        [sale.id, customer.id, amount, "DEBT"]
    );
    return { customerId: customer.id, saleId: sale.id, name };
}

async function cleanup(pool: Pool, debts: DebtFixture[]) {
    if (debts.length > 0) {
        await pool.query('DELETE FROM debtors WHERE "saleID" = ANY($1::int[])', [debts.map(debt => debt.saleId)]);
        await pool.query("DELETE FROM sales WHERE id = ANY($1::int[])", [debts.map(debt => debt.saleId)]);
        await pool.query("DELETE FROM customer WHERE id = ANY($1::int[])", [debts.map(debt => debt.customerId)]);
    }
    await pool.end();
}

async function openSummary(page: Page, name: string) {
    const row = page.getByRole("row").filter({ has: page.getByText(name, { exact: true }) });
    await row.getByRole("button").click();
    await page.getByRole("button", { name: "Cobrar", exact: true }).click();
    const summary = page.getByRole("dialog", { name: "Cobrar cuenta de " + name, exact: true });
    await expect(summary).toBeVisible();
    return summary;
}

async function capture(page: Page, name: string) {
    const path = test.info().outputPath(name + ".png");
    await page.screenshot({ path });
    await test.info().attach(name, { path, contentType: "image/png" });
}

test.describe("debtors", () => {
    for (const viewport of [{ width: 320, height: 480 }, { width: 1280, height: 800 }]) {
        test("requires cash confirmation and validates cents at " + viewport.width + "x" + viewport.height, async ({ page }) => {
            test.setTimeout(120_000);
            const pool = new Pool({ connectionString: E2E_DATABASE_URL });
            const debts: DebtFixture[] = [];
            const actions: Request[] = [];
            page.on("request", request => {
                if (request.method() === "POST" && request.headers()["next-action"]) actions.push(request);
            });
            try {
                const debt = await createDebt(pool, "Deudor efectivo " + viewport.width, "478.35");
                debts.push(debt);
                await page.setViewportSize(viewport);
                await page.goto("/debtors");
                const summary = await openSummary(page, debt.name);
                await expect(summary).toContainText("$478.35");
                await expect(summary.getByLabel("Efectivo recibido", { exact: true })).toHaveCount(0);
                await summary.getByRole("button", { name: "Registrar Cobro", exact: true }).click();

                const cash = page.getByRole("dialog", { name: "Cobrar en efectivo", exact: true });
                const received = cash.getByLabel("Efectivo recibido", { exact: true });
                const change = cash.getByRole("status");
                const confirm = cash.getByRole("button", { name: "Cobrar $478.35", exact: true });
                await expect(received).toHaveJSProperty("required", true);
                await expect(received).toHaveAttribute("inputmode", "decimal");
                await expect(change).toHaveText("Cambio a entregar: —");
                await expect(confirm).toBeDisabled();

                await received.fill("478,30");
                await expect(change).toHaveText("Faltan $0.05");
                await expect(received).toHaveAttribute("aria-invalid", "true");
                await expect(cash.getByRole("alert")).toHaveText("El monto recibido es menor al total del cobro. Ingresa un monto igual o mayor.");
                await expect(confirm).toBeDisabled();
                await cash.getByRole("alert").scrollIntoViewIfNeeded();
                await expect(confirm).toBeInViewport({ ratio: 1 });
                await capture(page, "cash-insufficient");

                for (const value of ["abc", "-1", "478.351", "478,351", "478,3.5", "1e3", "90071992547409.92"]) {
                    await received.fill(value);
                    await expect(change).toHaveText("Cambio a entregar: —");
                    await expect(cash.getByRole("alert")).toContainText("hasta dos decimales");
                    await expect(confirm).toBeDisabled();
                }

                for (const value of ["478.35", "478,35"]) {
                    await received.fill(value);
                    await expect(change).toHaveText("Cambio a entregar: $0.00");
                    await expect(received).toHaveAttribute("aria-invalid", "false");
                    await expect(cash.getByRole("alert")).toHaveCount(0);
                    await expect(confirm).toBeEnabled();
                }
                await received.fill("500,01");
                await expect(change).toHaveText("Cambio a entregar: $21.66");
                await expect(confirm).toBeEnabled();
                await expect(confirm).toBeInViewport({ ratio: 1 });
                await capture(page, "cash-valid");

                await received.press("Enter");
                await expect(received).not.toBeFocused();
                await expect(cash).toBeVisible();
                expect(actions).toHaveLength(0);
                expect((await pool.query<{ status: string }>("SELECT status FROM sales WHERE id = $1", [debt.saleId])).rows[0].status).toBe("DEBT");

                await confirm.click();
                await expect(cash).toHaveCount(0, { timeout: 15_000 });
                await expect(page.getByText(debt.name, { exact: true })).toHaveCount(0);
                expect(actions).toHaveLength(1);
                expect(actions[0].postData()).not.toContain("500,01");
                expect(actions[0].postData()).not.toContain("cashReceived");
                const state = (await pool.query<{ status: string; payment_method: string; balance: string; amount: string; debtStatus: string }>(
                    'SELECT s.status, s.payment_method, c."currentBalance"::text AS balance, d.amount::text, d.status AS "debtStatus" FROM sales s JOIN customer c ON c.id = s."customerID" JOIN debtors d ON d."saleID" = s.id WHERE s.id = $1',
                    [debt.saleId]
                )).rows[0];
                expect(state.status).toBe("PAID");
                expect(state.debtStatus).toBe("PAID");
                expect(state.payment_method).toBe("CASH");
                expect(Number(state.balance)).toBe(0);
                expect(Number(state.amount)).toBe(478.35);
            } finally {
                await cleanup(pool, debts);
            }
        });
    }

    test("clears received cash on method and account changes and transfers without the cash step", async ({ page }) => {
        test.setTimeout(120_000);
        const pool = new Pool({ connectionString: E2E_DATABASE_URL });
        const debts: DebtFixture[] = [];
        try {
            const first = await createDebt(pool, "Deudor cambio uno", "25.00");
            debts.push(first);
            const second = await createDebt(pool, "Deudor cambio dos", "35.00");
            debts.push(second);
            await page.setViewportSize({ width: 360, height: 640 });
            await page.goto("/debtors");
            let summary = await openSummary(page, first.name);
            await summary.getByRole("button", { name: "Registrar Cobro", exact: true }).click();
            const cash = page.getByRole("dialog", { name: "Cobrar en efectivo", exact: true });
            const received = cash.getByLabel("Efectivo recibido", { exact: true });
            await received.fill("50");
            await cash.getByRole("button", { name: "Volver a la cuenta", exact: true }).click();
            await expect(summary).toBeVisible();
            await summary.getByRole("combobox", { name: "Método de pago", exact: true }).click();
            await page.getByRole("option", { name: "Transferencia", exact: true }).click();
            await summary.getByRole("combobox", { name: "Método de pago", exact: true }).click();
            await page.getByRole("option", { name: "Efectivo", exact: true }).click();
            await summary.getByRole("button", { name: "Registrar Cobro", exact: true }).click();
            await expect(received).toHaveValue("");
            await received.fill("100");
            await cash.getByRole("button", { name: "Volver a la cuenta", exact: true }).click();
            await summary.getByRole("button", { name: "Cancelar", exact: true }).click();
            await expect(page.getByRole("menu")).toHaveCount(0);
            await expect(page.getByRole("row").filter({ has: page.getByText(first.name, { exact: true }) }).getByRole("button")).toBeFocused();

            summary = await openSummary(page, second.name);
            await summary.getByRole("button", { name: "Registrar Cobro", exact: true }).click();
            await expect(received).toHaveValue("");
            await cash.getByRole("button", { name: "Volver a la cuenta", exact: true }).click();
            await summary.getByRole("combobox", { name: "Método de pago", exact: true }).click();
            await page.getByRole("option", { name: "Transferencia", exact: true }).click();
            await expect(summary.getByLabel("Efectivo recibido", { exact: true })).toHaveCount(0);
            await summary.getByRole("button", { name: "Registrar Cobro", exact: true }).click();
            await expect(summary).toHaveCount(0, { timeout: 15_000 });
            await expect(cash).toHaveCount(0);
            const statuses = (await pool.query<{ id: number; status: string; payment_method: string | null }>(
                "SELECT id, status, payment_method FROM sales WHERE id = ANY($1::int[]) ORDER BY id",
                [[first.saleId, second.saleId]]
            )).rows;
            expect(statuses[0].status).toBe("DEBT");
            expect(statuses[1].status).toBe("PAID");
            expect(statuses[1].payment_method).toBe("TRANSFER");

            summary = await openSummary(page, first.name);
            await summary.getByRole("button", { name: "Registrar Cobro", exact: true }).click();
            await expect(received).toHaveValue("");
            await cash.getByRole("button", { name: "Volver a la cuenta", exact: true }).click();
            await summary.getByRole("button", { name: "Cancelar", exact: true }).click();
        } finally {
            await cleanup(pool, debts);
        }
    });
});
