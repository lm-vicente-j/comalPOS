import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", async () => {
    const { authMock } = await import("./helpers");
    return { auth: authMock };
});

import prisma from "@/lib/prisma";
import type { SaleStatus } from "@/app/generated/prisma/client";
import { getReport, getReportExport, getStatistics } from "@/lib/actions/analytics";
import { AnalyticsFilterSchema, AnalyticsReportSchema } from "@/lib/actions/schemas";
import {
    analyticsPeriod, businessDate, businessHour, businessMidnight, calendarDays,
    calendarRange, compareAmounts, defaultAnalyticsFilter, formatReportCell, isCalendarDate,
    reportCsv, timestampRange, type AnalyticsResult, type ReportData,
} from "@/lib/analytics";
import { loginAs, logout, resetDb, seedBase } from "./helpers";

const filter = { from: "2026-09-30", to: "2026-09-30" };
function data<T>(result: AnalyticsResult<T>): T {
    expect(result.success).toBe(true);
    if (!result.success) throw new Error(result.message);
    return result.data;
}
afterEach(() => vi.restoreAllMocks());

describe("analytics helpers without database queries", () => {
    it("uses Mexico City midnight for timestamps and UTC calendar days for Date columns", () => {
        expect(businessDate(new Date("2026-09-30T05:59:59Z"))).toBe("2026-09-29");
        expect(businessDate(new Date("2026-09-30T06:00:00Z"))).toBe("2026-09-30");
        expect(businessHour(new Date("2026-09-30T06:00:00Z"))).toBe(0);
        expect(businessMidnight("2026-09-30").toISOString()).toBe("2026-09-30T06:00:00.000Z");
        expect(businessMidnight("2021-09-30").toISOString()).toBe("2021-09-30T05:00:00.000Z");
        expect(timestampRange(filter).lt.toISOString()).toBe("2026-10-01T06:00:00.000Z");
        expect(calendarRange(filter).gte.toISOString()).toBe("2026-09-30T00:00:00.000Z");
        expect(calendarRange(filter).lt.toISOString()).toBe("2026-10-01T00:00:00.000Z");
        expect(formatReportCell("2026-09-30", "date")).toContain("30");
    });

    it("computes equal inclusive periods and zero comparison bases", () => {
        const now = new Date("2026-09-30T12:00:00Z");
        expect(defaultAnalyticsFilter(30, now)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
        expect(analyticsPeriod({ from: "2026-09-28", to: "2026-09-30" }, now)).toMatchObject({
            days: 3, previousFrom: "2026-09-25", previousTo: "2026-09-27", includesToday: true,
        });
        expect(analyticsPeriod(filter, new Date("2026-10-02T12:00:00Z")).includesToday).toBe(false);
        expect(compareAmounts(12.3, 0)).toEqual({ previous: 0, difference: 12.3, percentage: null });
        expect(compareAmounts(10, 20)).toEqual({ previous: 20, difference: -10, percentage: -50 });
    });

    it("validates actual calendar dates, preserved refinements and page query strings", () => {
        expect(isCalendarDate("2024-02-29")).toBe(true);
        expect(isCalendarDate("2026-02-29")).toBe(false);
        expect(isCalendarDate("2026-2-01")).toBe(false);
        expect(AnalyticsFilterSchema.safeParse({ from: "2026-10-01", to: "2026-09-30" }).success).toBe(false);
        expect(AnalyticsReportSchema.safeParse({ from: "2026-10-01", to: "2026-09-30", type: "sales" }).success).toBe(false);
        expect(AnalyticsReportSchema.parse({ ...filter, type: "sales", page: "2" }).page).toBe(2);
        for (const page of [0, -1, 1.5, "1e2", "", ["1", "2"], Number.MAX_SAFE_INTEGER + 1]) {
            expect(AnalyticsReportSchema.safeParse({ ...filter, type: "sales", page }).success).toBe(false);
        }
    });

    it("rounds monetary CSV cells and totals consistently with screen and print formatting", () => {
        const report: ReportData = {
            type: "expenses", period: analyticsPeriod(filter), generatedAt: new Date().toISOString(), notices: [],
            columns: [{ key: "description", label: "Descripción", kind: "text" }, { key: "amount", label: "Importe", kind: "money" }],
            rows: [{ description: "Compra", amount: 1.005 }], totals: { amount: 1.005 }, totalRows: 1, page: 1, pageSize: 50,
        };
        expect(formatReportCell(1.005, "money")).toBe("$1.01");
        expect(reportCsv(report)).toContain('"Compra","1.01"\r\n');
        expect(reportCsv(report)).toContain('"TOTAL","1.01"\r\n');
    });

    it("exports BOM, CRLF, quotes, newlines and neutralizes spreadsheet formulas after controls", () => {
        const report: ReportData = {
            type: "products", period: analyticsPeriod(filter), generatedAt: new Date().toISOString(), notices: [],
            columns: [{ key: "name", label: "Producto", kind: "text" }, { key: "amount", label: "Importe", kind: "money" }],
            rows: [{ name: '=SUM(1,2) "á"\ntexto', amount: 0.3 }, { name: "\u007f\t+1", amount: 0.1 },
                { name: "\u200b@SUM(1)", amount: 0.2 }, { name: "\rtexto", amount: 0 }],
            totals: { amount: 0.6 }, totalRows: 4, page: 1, pageSize: 50,
        };
        const csv = reportCsv(report);
        expect(csv).toMatch(/^\uFEFF"Producto","Importe"\r\n/);
        expect(csv).toContain('"\'=SUM(1,2) ""á""\ntexto","0.30"');
        expect(csv).toContain('"\'\u007f\t+1"');
        expect(csv).toContain('"\'\u200b@SUM(1)"');
        expect(csv).toContain('"\'\rtexto"');
        expect(csv).toMatch(/"TOTAL","0.60"\r\n$/);
    });
});

describe("analytics authorization and validation without database queries", () => {
    it("rejects STAFF and unauthenticated access including complete exports before querying", async () => {
        const query = vi.spyOn(prisma, "$transaction");
        for (const role of [null, "STAFF"] as const) {
            if (role) loginAs(role); else logout();
            expect(await getStatistics(filter)).toMatchObject({ success: false, error: "PERMISSION_DENIED" });
            expect(await getReport({ ...filter, type: "sales" })).toMatchObject({ success: false, error: "PERMISSION_DENIED" });
            expect(await getReportExport({ ...filter, type: "expenses" })).toMatchObject({ success: false, error: "PERMISSION_DENIED" });
        }
        expect(query).not.toHaveBeenCalled();
    });

    it("returns structured errors for invalid filters and never queries", async () => {
        loginAs("ADMIN");
        const query = vi.spyOn(prisma, "$transaction");
        for (const input of [undefined, { from: "2026-09-31", to: "2026-10-01" }, { from: [filter.from], to: filter.to }]) {
            expect(await getStatistics(input)).toMatchObject({ success: false, error: "INVALID_FILTER" });
        }
        expect(await getReport({ ...filter, type: "unknown" })).toMatchObject({ success: false, error: "INVALID_FILTER" });
        expect(await getReport({ ...filter, type: "sales", page: "1,2" })).toMatchObject({ success: false, error: "INVALID_FILTER" });
        expect(await getReportExport({ from: filter.to, to: "2026-09-29", type: "sales" })).toMatchObject({ success: false, error: "INVALID_FILTER" });
        expect(query).not.toHaveBeenCalled();
    });

    it("returns retryable query failures instead of plausible empty datasets or internal details", async () => {
        loginAs("ADMIN");
        vi.spyOn(prisma, "$transaction").mockRejectedValue(new Error("private database connection details"));
        for (const result of [await getStatistics(filter), await getReport({ ...filter, type: "sales" }), await getReportExport({ ...filter, type: "sales" })]) {
            expect(result).toMatchObject({ success: false, error: "QUERY_FAILED" });
            expect(result).not.toHaveProperty("data");
            expect(JSON.stringify(result)).not.toContain("private");
        }
    });
});

describe("analytics database integration", () => {
    let adminId: number;
    let productId: number;
    let customerId: number;
    beforeAll(() => {
        const connection = new URL(process.env.DATABASE_URL!);
        if (!["localhost", "127.0.0.1", "[::1]"].includes(connection.hostname) || connection.pathname !== "/comalpos_test") {
            throw new Error("Analytics integration tests only run against the local comalpos_test database.");
        }
    });
    beforeEach(async () => {
        await resetDb();
        const { admin } = await seedBase();
        adminId = admin.id;
        productId = (await prisma.products.create({ data: { name: "Sope de época", price: 999 } })).id;
        customerId = (await prisma.customer.create({ data: { customerName: "María", currentBalance: 0 } })).id;
        loginAs("ADMIN", adminId);
    });
    async function sale(options: {
        at?: string; status?: SaleStatus; total?: number | null; quantity?: number;
        subtotal?: number; customer?: boolean; method?: string | null; source?: string | null; items?: boolean;
    } = {}) {
        const quantity = options.quantity ?? 1;
        const subtotal = options.subtotal ?? (options.total === null ? 0.1 : options.total ?? 10);
        return prisma.sales.create({ data: {
            placedBy: adminId, createdAt: new Date(options.at ?? "2026-09-30T12:00:00Z"),
            status: options.status ?? "PAID", total: options.total === undefined ? 10 : options.total,
            source_type: options.source === undefined ? "VENTA_LIBRE" : options.source,
            payment_method: options.method === undefined ? "CASH" : options.method,
            customerID: options.customer ? customerId : null,
            ...(options.items === false ? {} : { sale_items: { create: { productID: productId, quantity, unitPrice: subtotal / quantity, subtotal } } }),
        } });
    }

    it("works with no sales and still shows independent expenses and salaries", async () => {
        const empty = data(await getStatistics(filter));
        expect(empty).toMatchObject({ paidAmount: 0, units: 0, paidRecords: 0, identifiedCustomers: 0, expensesAmount: 0, salariesAmount: 0 });
        expect(empty.amountComparison.percentage).toBeNull();
        expect(empty.products).toEqual([]);
        expect(empty.daily).toEqual([{ label: filter.from, amount: 0, units: 0, records: 0 }]);
        for (const type of ["sales", "products", "expenses", "salaries", "customers", "debts"] as const) {
            expect(data(await getReport({ ...filter, type })).rows).toEqual([]);
        }
        await prisma.bill.create({ data: { amount: 100.1, date: new Date("2026-09-30T00:00:00Z"), registered_by: adminId, category: "Insumos" } });
        await prisma.salary.create({ data: { amount: 200.2, payDate: new Date("2026-09-30T00:00:00Z"), userID: adminId } });
        const result = data(await getStatistics(filter));
        expect(result).toMatchObject({ paidAmount: 0, paidRecords: 0, expensesAmount: 100.1, expensesCount: 1, salariesAmount: 200.2, salariesCount: 1 });
        expect(result.expenses[0]).toMatchObject({ label: "Insumos", amount: 100.1, records: 1 });
        expect(result.salaries[0]).toMatchObject({ amount: 200.2, records: 1 });
    });

    it("aggregates PAID only, historical subtotals, precise decimals, timezone boundaries and previous period", async () => {
        await sale({ at: "2026-09-29T12:00:00Z", total: 40 });
        await sale({ at: "2026-09-30T05:59:59Z", total: 3 });
        await sale({ at: "2026-09-30T06:00:00Z", total: 100, quantity: 2, customer: true, source: "MESA_1" });
        await sale({ at: "2026-10-01T05:59:59Z", total: 0.2, customer: true, method: "TRANSFER" });
        await sale({ total: null, customer: true, method: null, source: null });
        const incomplete = await sale({ total: null, items: false, method: null });
        await sale({ at: "2026-10-01T06:00:00Z", total: 999 });
        for (const status of ["UNPAID", "DEBT", "CANCELLED"] as const) await sale({ status, total: 999, quantity: 50 });
        const result = data(await getStatistics(filter));
        expect(result).toMatchObject({ paidAmount: 100.3, units: 4, paidRecords: 4, identifiedCustomers: 1 });
        expect(result.amountComparison.previous).toBe(43);
        expect(result.amountComparison.difference).toBe(57.3);
        expect(result.amountComparison.percentage).toBeCloseTo(57.3 / 43 * 100);
        expect(result.unitsComparison).toEqual({ previous: 2, difference: 2, percentage: 100 });
        expect(result.products[0]).toMatchObject({ id: productId, amount: 100.3, units: 4, participation: 100 });
        expect(result.daily[0]).toMatchObject({ amount: 100.3, units: 4, records: 4 });
        expect(result.hourly.find(row => row.label === "00:00")).toMatchObject({ amount: 100, records: 1 });
        expect(result.hourly.find(row => row.label === "23:00")).toMatchObject({ amount: 0.2, records: 1 });
        expect(result.weekdays.find(row => row.label === "Miércoles")).toMatchObject({ amount: 100.3, records: 4 });
        expect(result.paymentMethods.find(row => row.label === "Sin especificar")).toMatchObject({ amount: 0.1, records: 2 });
        expect(result.sourceTypes.find(row => row.label === "Mesa")).toMatchObject({ amount: 100, units: 2 });
        expect(result.customers[0]).toMatchObject({ name: "María", amount: 100.3, units: 4, days: 1 });
        expect(result.notices.join(" ")).toContain("subtotales históricos");
        expect(result.notices.join(" ")).toContain("importe es desconocido");
        const report = data(await getReport({ ...filter, type: "sales" }));
        expect(report.totalRows).toBe(4);
        expect(report.totals).toEqual({ amount: 100.3, units: 4 });
        expect(report.rows.find(row => row.id === incomplete.id)?.amount).toBeNull();
        expect(report.rows.some(row => row.paymentMethod === "Sin especificar")).toBe(true);
        const products = data(await getReport({ ...filter, type: "products" }));
        expect(products.totals).toEqual({ amount: 100.3, units: 4, participation: 100 });
        expect(products.rows[0].amount).toBe(100.3);
        expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    });

    it("preserves calendar dates, excludes undated records with notices and supplies missing labels", async () => {
        await prisma.users.update({ where: { id: adminId }, data: { name: null } });
        await prisma.customer.update({ where: { id: customerId }, data: { customerName: null } });
        await prisma.products.update({ where: { id: productId }, data: { name: null } });
        await sale({ customer: true, source: null, method: null });
        await prisma.bill.createMany({ data: [
            { amount: 0.1, date: new Date("2026-09-30T00:00:00Z"), registered_by: adminId },
            { amount: 999, date: null, registered_by: adminId },
            { amount: 999, date: new Date("2026-09-29T00:00:00Z"), registered_by: adminId },
        ] });
        await prisma.salary.createMany({ data: [
            { amount: 0.2, payDate: new Date("2026-09-30T00:00:00Z"), userID: adminId },
            { amount: 999, payDate: null, userID: adminId },
        ] });
        const result = data(await getStatistics(filter));
        expect(result).toMatchObject({ expensesAmount: 0.1, salariesAmount: 0.2 });
        expect(result.notices.join(" ")).toContain("egresos sin fecha");
        expect(result.notices.join(" ")).toContain("salarios sin fecha");
        expect(result.products[0].name).toBe("Sin especificar");
        expect(result.customers[0].name).toBe("Sin especificar");
        const expenses = data(await getReport({ ...filter, type: "expenses" }));
        expect(expenses.rows).toEqual([{ date: filter.from, category: "Sin especificar", description: "Sin especificar", amount: 0.1, employee: "Sin especificar" }]);
        const salaries = data(await getReport({ ...filter, type: "salaries" }));
        expect(salaries.rows).toEqual([{ date: filter.from, employee: "Sin especificar", period: "Sin especificar", amount: 0.2 }]);
    });

    it("counts distinct customer purchase dates and excludes anonymous sales from the customer report", async () => {
        await sale({ customer: true, total: 10, quantity: 2 });
        await sale({ customer: true, total: 20, quantity: 1 });
        await sale({ customer: true, at: "2026-10-01T12:00:00Z", total: 30, quantity: 3 });
        await sale({ total: 100, quantity: 10 });
        const report = data(await getReport({ from: filter.from, to: "2026-10-01", type: "customers" }));
        expect(report.rows).toEqual([{ name: "María", amount: 60, units: 6, days: 2 }]);
        expect(report.totals).toEqual({ amount: 60, units: 6 });
    });

    it("keeps salary groups separate for employees with the same visible name", async () => {
        await prisma.users.update({ where: { id: adminId }, data: { name: "Juan Pérez" } });
        const colleague = await prisma.users.create({ data: { name: "Juan Pérez", role: "STAFF", active: true } });
        await prisma.salary.createMany({ data: [
            { amount: 100, userID: adminId, payDate: new Date("2026-09-30T00:00:00Z") },
            { amount: 50, userID: adminId, payDate: new Date("2026-09-30T00:00:00Z") },
            { amount: 200, userID: colleague.id, payDate: new Date("2026-09-30T00:00:00Z") },
        ] });
        const result = data(await getStatistics(filter));
        expect(result.salariesAmount).toBe(350);
        expect(result.salariesCount).toBe(3);
        expect(result.salaries).toEqual([
            { label: "Juan Pérez", amount: 200, units: 0, records: 1 },
            { label: "Juan Pérez", amount: 150, units: 0, records: 2 },
        ]);
    });

    it("reports only current outstanding debts by origin date, excluding paid, canceled and zero balances", async () => {
        const open = await sale({ status: "DEBT", total: 14, customer: true });
        await prisma.debtors.create({ data: { saleID: open.id, customerID: customerId, amount: 14, status: "DEBT" } });
        for (const [status, debtStatus, paidAt, amount, at] of [
            ["CANCELLED", "DEBT", null, 30, "2026-09-30T12:00:00Z"],
            ["PAID", "PAID", new Date("2026-09-30T00:00:00Z"), 30, "2026-09-30T12:00:00Z"],
            ["PAID", "DEBT", null, 30, "2026-09-30T12:00:00Z"],
            ["DEBT", "DEBT", new Date("2026-09-30T00:00:00Z"), 30, "2026-09-30T12:00:00Z"],
            ["DEBT", "DEBT", null, 0, "2026-09-30T12:00:00Z"],
            ["DEBT", "DEBT", null, 30, "2026-09-29T12:00:00Z"],
        ] as const) {
            const record = await sale({ status, at, customer: true });
            await prisma.debtors.create({ data: { saleID: record.id, customerID: customerId, amount, status: debtStatus, paidAt } });
        }
        const report = data(await getReport({ ...filter, type: "debts" }));
        expect(report.totalRows).toBe(1);
        expect(report.rows[0]).toMatchObject({ customer: "María", amount: 14, date: open.createdAt.toISOString(), ageDays: Math.max(0, calendarDays(filter.from, businessDate())) });
        expect(report.totals).toEqual({ amount: 14 });
        expect(report.notices.join(" ")).toContain("No representa el saldo histórico");
        await prisma.debtors.update({ where: { saleID: open.id }, data: { status: "PAID", paidAt: new Date() } });
        expect(data(await getReportExport({ ...filter, type: "debts" })).rows).toEqual([]);
    });

    it("paginates 50 rows and exports every matching row with identical full-period totals", async () => {
        await prisma.bill.createMany({ data: Array.from({ length: 55 }, (_, index) => ({
            description: `Compra de maíz ${index}`, amount: 0.1, category: "Insumos",
            date: new Date("2026-09-30T00:00:00Z"), registered_by: adminId,
        })) });
        await prisma.sales.createMany({ data: Array.from({ length: 55 }, () => ({
            status: "PAID" as const, total: 0.1, placedBy: adminId, createdAt: new Date("2026-09-30T12:00:00Z"),
        })) });
        for (const type of ["expenses", "sales"] as const) {
            const first = data(await getReport({ ...filter, type, page: 1 }));
            const second = data(await getReport({ ...filter, type, page: "2" }));
            const full = data(await getReportExport({ ...filter, type }));
            expect(first.rows).toHaveLength(50);
            expect(second.rows).toHaveLength(5);
            expect(first.totalRows).toBe(55);
            expect(full.rows).toHaveLength(55);
            expect(first.totals.amount).toBe(5.5);
            expect(full.totals).toEqual(first.totals);
            expect(second.totals).toEqual(first.totals);
            expect(full.rows).toEqual([...first.rows, ...second.rows]);
            expect(reportCsv(full).split("\r\n")).toHaveLength(58);
        }
    });
});
