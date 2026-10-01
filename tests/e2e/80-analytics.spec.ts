import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";
import { analyticsUrl, defaultAnalyticsFilter, money } from "@/lib/analytics";

const filter = { from: "2026-01-15", to: "2026-01-15" };
const database = new URL(E2E_DATABASE_URL);
if (database.pathname !== "/comalpos_test_e2e") throw new Error("Analytics E2E requires comalpos_test_e2e");
const pool = new Pool({ connectionString: E2E_DATABASE_URL });
let productId: number;
let customerId: number;
let staffId: number;
let expenseIds: number[] = [];
let salaryId: number;
let saleIds: number[] = [];
let productName = "";

test.beforeAll(async () => {
    const admin = (await pool.query<{ id: number }>('SELECT id FROM users WHERE email=$1', ["admin@e2e.local"])).rows[0];
    productName = "Café Analítica " + process.pid;
    productId = (await pool.query<{ id: number }>('INSERT INTO products(name,price) VALUES($1,999) RETURNING id', [productName])).rows[0].id;
    customerId = (await pool.query<{ id: number }>('INSERT INTO customer("customerName","currentBalance") VALUES($1,99) RETURNING id', ["Cliente Analítica"])).rows[0].id;
    staffId = (await pool.query<{ id: number }>('INSERT INTO users(name,username,pin,role,active) VALUES($1,$2,$3,$4,true) RETURNING id',
        ["Staff Analítica", "ANALYTICS", await bcrypt.hash("1234", 10), "STAFF"])).rows[0].id;
    const paid = await pool.query<{ id: number }>(
        `INSERT INTO sales(total,status,source_type,payment_method,"createdAt","placedBy","customerID")
        SELECT 20,'PAID'::"SaleStatus",'VENTA_LIBRE',CASE WHEN n%2=0 THEN 'CASH' ELSE 'TRANSFER' END,
        '2026-01-15 12:00:00'::timestamp,$1,$2 FROM generate_series(1,61) AS n RETURNING id`,
        [admin.id, customerId]);
    saleIds = paid.rows.map(row => row.id);
    await pool.query('INSERT INTO sale_items("saleID","productID",quantity,"unitPrice",subtotal) SELECT id,$1,2,10,20 FROM sales WHERE id=ANY($2::int[])', [productId, saleIds]);
    for (const status of ["DEBT", "UNPAID", "CANCELLED"]) {
        const sale = (await pool.query<{ id: number }>(
            `INSERT INTO sales(total,status,source_type,"customerID","placedBy","createdAt")
            VALUES(99,$1::"SaleStatus",'CL- Cliente Analítica',$2,$3,'2026-01-15 13:00:00') RETURNING id`,
            [status, customerId, admin.id])).rows[0];
        saleIds.push(sale.id);
        await pool.query('INSERT INTO sale_items("saleID","productID",quantity,"unitPrice",subtotal) VALUES($1,$2,1,99,99)', [sale.id, productId]);
        if (status !== "UNPAID") await pool.query('INSERT INTO debtors("saleID","customerID",amount,status) VALUES($1,$2,99,$3::"SaleStatus")', [sale.id, customerId, "DEBT"]);
    }
    expenseIds = (await pool.query<{ id: number }>(
        `INSERT INTO bill(amount,category,description,date,registered_by)
        VALUES(5,'Analítica',$1,'2026-01-15',$2),(13.5,'Operación Analítica','Egreso sin ventas','2020-01-15',$2) RETURNING id`,
        ['=SUM(A1) "Café"\nsegunda línea', admin.id])).rows.map(row => row.id);
    salaryId = (await pool.query<{ id: number }>('INSERT INTO salary(amount,"userID",period,"payDate") VALUES(17,$1,$2,$3) RETURNING id',
        [staffId, "Analítica", "2020-01-15"])).rows[0].id;
});
test.afterAll(async () => {
    await pool.query('DELETE FROM debtors WHERE "saleID"=ANY($1::int[])', [saleIds]);
    await pool.query('DELETE FROM sale_items WHERE "saleID"=ANY($1::int[])', [saleIds]);
    await pool.query('DELETE FROM sales WHERE id=ANY($1::int[])', [saleIds]);
    await pool.query('DELETE FROM bill WHERE id=ANY($1::int[])', [expenseIds]);
    if (salaryId) await pool.query('DELETE FROM salary WHERE id=$1', [salaryId]);
    if (productId) await pool.query('DELETE FROM products WHERE id=$1', [productId]);
    if (customerId) await pool.query('DELETE FROM customer WHERE id=$1', [customerId]);
    if (staffId) await pool.query('DELETE FROM users WHERE id=$1', [staffId]);
    await pool.end();
});

test("shows paid historical amounts, filters and both responsive views", async ({ page }, testInfo) => {
    await page.goto("/admin/statistics");
    await expect(page.getByRole("heading", { name: "Estadísticas", exact: true })).toBeVisible();
    await expect(page.getByLabel("Desde", { exact: true })).toHaveValue(defaultAnalyticsFilter().from);
    await page.goto(analyticsUrl("/admin/statistics", filter));
    await expect(page.getByText(money(1220), { exact: true }).first()).toBeVisible();
    await expect(page.getByText(productName, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Predicción pendiente/)).toBeVisible();
    await page.getByLabel("Desde", { exact: true }).fill("2026-01-14");
    // The dashboard refreshes every 10s; an unapplied draft must survive.
    await page.waitForTimeout(11_000);
    await expect(page.getByLabel("Desde", { exact: true })).toHaveValue("2026-01-14");
    await page.getByLabel("Desde", { exact: true }).fill(filter.from);
    await page.screenshot({ path: testInfo.outputPath("statistics.png"), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
});

test("keeps expenses and salaries visible when there are no paid sales", async ({ page }) => {
    await page.goto(analyticsUrl("/admin/statistics", { from: "2020-01-15", to: "2020-01-15" }));
    await expect(page.getByText(/Sin ventas pagadas/).first()).toBeVisible();
    await expect(page.getByText(money(13.5), { exact: true }).first()).toBeVisible();
    await expect(page.getByText(money(17), { exact: true }).first()).toBeVisible();
});

test("paginates 50 rows and exports/prints all 61 with the same totals", async ({ page }, testInfo) => {
    await page.goto(analyticsUrl("/admin/reports", filter, { type: "sales" }));
    const manager = page.getByTestId("reports-manager");
    await expect(manager.locator("tbody [data-report-row]")).toHaveCount(50);
    await page.getByRole("button", { name: "Siguiente", exact: true }).click();
    await expect(manager.locator("tbody [data-report-row]")).toHaveCount(11);
    await expect(manager.locator("tfoot")).toContainText(money(1220));
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
    const download = await downloadPromise;
    const csv = await readFile((await download.path())!, "utf8");
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(63);
    expect(csv).toContain('"TOTAL"');
    expect(csv).toContain('"1220.00"');
    await page.evaluate(() => {
        window.print = () => {
            const report = document.querySelector("#analytics-print-report")!;
            (window as unknown as { analyticsPrinted: { rows: number; text: string } }).analyticsPrinted = {
                rows: report.querySelectorAll("[data-report-row]").length,
                text: report.textContent ?? "",
            };
        };
    });
    await page.getByRole("button", { name: "Imprimir / PDF", exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { analyticsPrinted?: { rows: number } }).analyticsPrinted?.rows)).toBe(61);
    expect(await page.evaluate(() => (window as unknown as { analyticsPrinted: { text: string } }).analyticsPrinted.text)).toContain(money(1220));
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("#analytics-print-report")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("report-print.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await page.emulateMedia({ media: "screen" });
    await expect(page.locator("body")).not.toHaveClass(/analytics-printing/);
    await page.screenshot({ path: testInfo.outputPath("reports.png"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
});

test("escapes CSV text and shows only pending non-cancelled debts", async ({ page }) => {
    await page.goto(analyticsUrl("/admin/reports", filter, { type: "expenses" }));
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV", exact: true }).click();
    const csv = await readFile((await (await downloadPromise).path())!, "utf8");
    expect(csv).toContain("'=SUM(A1)");
    expect(csv).toContain('""Café""');
    await page.goto(analyticsUrl("/admin/reports", filter, { type: "debts" }));
    await expect(page.getByTestId("reports-manager").locator("tbody [data-report-row]")).toHaveCount(1);
    await expect(page.getByTestId("reports-manager").locator("tfoot")).toContainText(money(99));
    await expect(page.getByText(/saldo pendiente actual/i).first()).toBeVisible();
});

test("rejects invalid filters instead of displaying zero results", async ({ page }) => {
    await page.goto("/admin/statistics?from=2026-02-30&to=2026-03-01");
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
    await page.goto("/admin/reports?type=invalid&from=2026-01-15&to=2026-01-15");
    await expect(page.getByRole("alert").first()).toBeVisible();
});

test("redirects unauthenticated and staff visits", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("/admin/statistics");
    await expect(page).toHaveURL(/\/login/);
    await page.getByRole("tab", { name: "Staff", exact: true }).click();
    await page.locator('input[name="username"]').fill("ANALYTICS");
    await page.locator('[data-input-otp]').fill("1234");
    await page.getByRole("button", { name: "Entrar al Sistema" }).click();
    await page.waitForURL("**/pos");
    await page.goto("/admin/reports");
    await expect(page).toHaveURL(/\/pos/);
    await page.goto("/admin/statistics");
    await expect(page).toHaveURL(/\/pos/);
    await context.close();
});
