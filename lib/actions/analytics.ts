"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { Decimal } from "@prisma/client/runtime/client";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { formatSourceType } from "@/lib/pos-source";
import {
    analyticsPeriod, businessDate, businessHour, calendarDays, calendarRange,
    paymentMethodLabel, REPORT_PAGE_SIZE, saleOrigin, shiftCalendarDate, specified, timestampRange,
    type AmountGroup, type AnalyticsFilter, type AnalyticsResult, type Comparison,
    type CustomerMetric, type ProductMetric, type ReportColumn, type ReportData,
    type ReportRow, type ReportType, type StatisticsData,
} from "@/lib/analytics";
import { AnalyticsFilterSchema, AnalyticsReportSchema } from "./schemas";

const saleSelect = {
    id: true, total: true, source_type: true, payment_method: true, createdAt: true,
    customer: { select: { id: true, customerName: true } },
    users: { select: { name: true } },
    sale_items: { select: { productID: true, quantity: true, subtotal: true, products: { select: { name: true } } } },
} as const satisfies Prisma.salesSelect;
type PaidSale = Prisma.salesGetPayload<{ select: typeof saleSelect }>;
const expenseSelect = {
    id: true, amount: true, category: true, description: true, date: true,
    users: { select: { name: true } },
} as const satisfies Prisma.billSelect;
const salarySelect = {
    id: true, amount: true, payDate: true, period: true, userID: true,
    users: { select: { name: true } },
} as const satisfies Prisma.salarySelect;

const permissionError = {
    success: false, error: "PERMISSION_DENIED", message: "Solo los administradores pueden consultar estadísticas y reportes.",
} as const;
const filterError = {
    success: false, error: "INVALID_FILTER", message: "Revisa el tipo de reporte, las fechas y el número de página.",
} as const;
const queryError = {
    success: false, error: "QUERY_FAILED", message: "No se pudo consultar la información. Intenta de nuevo.",
} as const;
const saleNotice = "Las ventas corresponden a su fecha de registro y estado actual; no existe una fecha general de cobro.";

function decimalSum(values: Decimal[]): Decimal {
    return values.reduce((total, value) => total.plus(value), new Decimal(0));
}
function saleAmount(sale: PaidSale): Decimal | null {
    if (sale.total !== null) return sale.total;
    return sale.sale_items.length ? decimalSum(sale.sale_items.map(item => item.subtotal)) : null;
}
function saleUnits(sale: PaidSale): number {
    return sale.sale_items.reduce((total, item) => total + item.quantity, 0);
}
function salesTotal(sales: PaidSale[]): Decimal {
    return decimalSum(sales.flatMap(sale => {
        const amount = saleAmount(sale);
        return amount === null ? [] : [amount];
    }));
}
function monetaryNotices(sales: PaidSale[], periodLabel = "del periodo"): string[] {
    const recovered = sales.filter(sale => sale.total === null && sale.sale_items.length > 0).length;
    const missing = sales.filter(sale => sale.total === null && sale.sale_items.length === 0).length;
    return [
        ...(recovered ? [`${recovered} ventas ${periodLabel} no tienen total guardado: su importe se obtuvo de los subtotales históricos.`] : []),
        ...(missing ? [`${missing} ventas ${periodLabel} no tienen total ni partidas: su importe es desconocido y se excluye de las sumas monetarias.`] : []),
    ];
}
function comparison(current: Decimal, previous: Decimal): Comparison {
    const difference = current.minus(previous);
    return {
        previous: previous.toNumber(), difference: difference.toNumber(),
        percentage: previous.isZero() ? null : difference.dividedBy(previous).times(100).toNumber(),
    };
}
type DecimalGroup = { label: string; amount: Decimal; units: number; records: number };
function emptyGroup(label: string): DecimalGroup {
    return { label, amount: new Decimal(0), units: 0, records: 0 };
}
function addGroup(groups: Map<string, DecimalGroup>, key: string, amount: Decimal | null, units = 0, label = key) {
    const group = groups.get(key) ?? emptyGroup(label);
    if (amount !== null) group.amount = group.amount.plus(amount);
    group.units += units;
    group.records++;
    groups.set(key, group);
}
function serializeGroups(groups: Map<string, DecimalGroup>, sortByAmount = false): AmountGroup[] {
    const rows = [...groups.values()];
    if (sortByAmount) rows.sort((a, b) => b.amount.comparedTo(a.amount) || a.label.localeCompare(b.label, "es"));
    return rows.map(group => ({ ...group, amount: group.amount.toNumber() }));
}
function productMetrics(sales: PaidSale[], total: Decimal): ProductMetric[] {
    const products = new Map<number, { id: number; name: string; amount: Decimal; units: number }>();
    for (const sale of sales) for (const item of sale.sale_items) {
        const product = products.get(item.productID) ?? {
            id: item.productID, name: specified(item.products.name), amount: new Decimal(0), units: 0,
        };
        product.amount = product.amount.plus(item.subtotal);
        product.units += item.quantity;
        products.set(item.productID, product);
    }
    return [...products.values()]
        .sort((a, b) => b.amount.comparedTo(a.amount) || b.units - a.units || a.id - b.id)
        .map(product => ({
            ...product, amount: product.amount.toNumber(),
            participation: total.isZero() ? 0 : product.amount.dividedBy(total).times(100).toNumber(),
        }));
}
function customerMetrics(sales: PaidSale[]): CustomerMetric[] {
    const customers = new Map<number, { id: number; name: string; amount: Decimal; units: number; days: Set<string> }>();
    for (const sale of sales) {
        if (!sale.customer) continue;
        const customer = customers.get(sale.customer.id) ?? {
            id: sale.customer.id, name: specified(sale.customer.customerName), amount: new Decimal(0), units: 0, days: new Set<string>(),
        };
        const amount = saleAmount(sale);
        if (amount !== null) customer.amount = customer.amount.plus(amount);
        customer.units += saleUnits(sale);
        customer.days.add(businessDate(sale.createdAt));
        customers.set(sale.customer.id, customer);
    }
    return [...customers.values()]
        .sort((a, b) => b.amount.comparedTo(a.amount) || a.id - b.id)
        .map(customer => ({ ...customer, amount: customer.amount.toNumber(), days: customer.days.size }));
}
function missingDateNotice(count: number, subject: string): string[] {
    return count ? [`Hay ${count} ${subject} sin fecha registrada; se excluyen de los resultados por periodo.`] : [];
}
function orderedSales(tx: Prisma.TransactionClient, filter: AnalyticsFilter) {
    return tx.sales.findMany({
        where: { status: "PAID", createdAt: timestampRange(filter) }, select: saleSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
}

export async function getStatistics(input: unknown): Promise<AnalyticsResult<StatisticsData>> {
    try {
        if ((await auth())?.user?.role !== "ADMIN") return permissionError;
        const parsed = AnalyticsFilterSchema.safeParse(input);
        if (!parsed.success) return filterError;
        const period = analyticsPeriod(parsed.data);
        const previousFilter = { from: period.previousFrom, to: period.previousTo };
        const [sales, previousSales, expenses, salaries, undatedExpenses, undatedSalaries] = await prisma.$transaction(async tx => Promise.all([
            orderedSales(tx, parsed.data), orderedSales(tx, previousFilter),
            tx.bill.findMany({ where: { date: calendarRange(parsed.data) }, select: expenseSelect }),
            tx.salary.findMany({ where: { payDate: calendarRange(parsed.data) }, select: salarySelect }),
            tx.bill.count({ where: { date: null } }), tx.salary.count({ where: { payDate: null } }),
        ]), { isolationLevel: "RepeatableRead", timeout: 30_000 });

        const total = salesTotal(sales);
        const units = sales.reduce((sum, sale) => sum + saleUnits(sale), 0);
        const daily = new Map<string, DecimalGroup>();
        for (let day = period.from; day <= period.to; day = shiftCalendarDate(day, 1)) daily.set(day, emptyGroup(day));
        const hourly = new Map(Array.from({ length: 24 }, (_, hour) => {
            const label = `${String(hour).padStart(2, "0")}:00`;
            return [label, emptyGroup(label)] as const;
        }));
        const weekdayLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const weekdays = new Map([...weekdayLabels.slice(1), weekdayLabels[0]].map(label => [label, emptyGroup(label)]));
        const methods = new Map<string, DecimalGroup>();
        const sources = new Map<string, DecimalGroup>();
        for (const sale of sales) {
            const date = businessDate(sale.createdAt);
            const amount = saleAmount(sale);
            const quantity = saleUnits(sale);
            addGroup(daily, date, amount, quantity);
            addGroup(hourly, `${String(businessHour(sale.createdAt)).padStart(2, "0")}:00`, amount, quantity);
            addGroup(weekdays, weekdayLabels[new Date(date + "T00:00:00Z").getUTCDay()], amount, quantity);
            addGroup(methods, paymentMethodLabel(sale.payment_method), amount, quantity);
            addGroup(sources, saleOrigin(sale.source_type), amount, quantity);
        }
        const expenseGroups = new Map<string, DecimalGroup>();
        for (const expense of expenses) addGroup(expenseGroups, specified(expense.category), expense.amount);
        const salaryGroups = new Map<string, DecimalGroup>();
        for (const salary of salaries) addGroup(salaryGroups, String(salary.userID), salary.amount, 0, specified(salary.users.name));
        const customers = customerMetrics(sales);
        return { success: true, data: {
            period, generatedAt: new Date().toISOString(),
            notices: [saleNotice, ...monetaryNotices(sales), ...monetaryNotices(previousSales, "del periodo anterior"),
                ...missingDateNotice(undatedExpenses, "egresos"), ...missingDateNotice(undatedSalaries, "salarios")],
            paidAmount: total.toNumber(), units, paidRecords: sales.length, identifiedCustomers: customers.length,
            expensesAmount: decimalSum(expenses.map(expense => expense.amount)).toNumber(), expensesCount: expenses.length,
            salariesAmount: decimalSum(salaries.map(salary => salary.amount)).toNumber(), salariesCount: salaries.length,
            amountComparison: comparison(total, salesTotal(previousSales)),
            unitsComparison: comparison(new Decimal(units), new Decimal(previousSales.reduce((sum, sale) => sum + saleUnits(sale), 0))),
            daily: serializeGroups(daily), hourly: serializeGroups(hourly), weekdays: serializeGroups(weekdays),
            products: productMetrics(sales, total), customers, paymentMethods: serializeGroups(methods, true),
            sourceTypes: serializeGroups(sources, true), expenses: serializeGroups(expenseGroups, true), salaries: serializeGroups(salaryGroups, true),
        } };
    } catch {
        return queryError;
    }
}

const reportColumns: Record<ReportType, ReportColumn[]> = {
    sales: [
        { key: "id", label: "Venta", kind: "integer" }, { key: "date", label: "Fecha de registro", kind: "datetime" },
        { key: "products", label: "Productos y cantidades", kind: "text" }, { key: "units", label: "Unidades", kind: "integer" },
        { key: "amount", label: "Importe pagado", kind: "money" }, { key: "source", label: "Origen", kind: "text" },
        { key: "paymentMethod", label: "Forma de pago", kind: "text" }, { key: "customer", label: "Cliente", kind: "text" },
        { key: "employee", label: "Empleado", kind: "text" },
    ],
    products: [
        { key: "name", label: "Producto", kind: "text" }, { key: "units", label: "Unidades", kind: "integer" },
        { key: "amount", label: "Importe vendido", kind: "money" }, { key: "participation", label: "Participación (%)", kind: "percent" },
    ],
    expenses: [
        { key: "date", label: "Fecha", kind: "date" }, { key: "category", label: "Categoría", kind: "text" },
        { key: "description", label: "Descripción", kind: "text" }, { key: "amount", label: "Importe", kind: "money" },
        { key: "employee", label: "Responsable", kind: "text" },
    ],
    salaries: [
        { key: "date", label: "Fecha de pago", kind: "date" }, { key: "employee", label: "Empleado", kind: "text" },
        { key: "period", label: "Periodo", kind: "text" }, { key: "amount", label: "Importe", kind: "money" },
    ],
    customers: [
        { key: "name", label: "Cliente", kind: "text" }, { key: "amount", label: "Importe pagado", kind: "money" },
        { key: "units", label: "Unidades", kind: "integer" }, { key: "days", label: "Días con compras", kind: "integer" },
    ],
    debts: [
        { key: "id", label: "Fiado", kind: "integer" }, { key: "customer", label: "Cliente", kind: "text" },
        { key: "date", label: "Fecha de origen", kind: "datetime" }, { key: "amount", label: "Saldo pendiente actual", kind: "money" },
        { key: "ageDays", label: "Antigüedad (días)", kind: "integer" },
    ],
};

async function reportSnapshot(tx: Prisma.TransactionClient, filter: AnalyticsFilter, type: ReportType) {
    const rows: ReportRow[] = [];
    const totals: ReportRow = {};
    const notices: string[] = [];
    if (type === "sales" || type === "products" || type === "customers") {
        const sales = await orderedSales(tx, filter);
        const total = salesTotal(sales);
        notices.push(saleNotice, ...monetaryNotices(sales));
        if (type === "sales") {
            rows.push(...sales.map(sale => ({
                id: sale.id, date: sale.createdAt.toISOString(),
                products: sale.sale_items.map(item => `${specified(item.products.name)} × ${item.quantity}`).join("; ") || "Sin especificar",
                units: saleUnits(sale), amount: saleAmount(sale)?.toNumber() ?? null,
                source: sale.source_type?.trim() ? formatSourceType(sale.source_type) : "Sin especificar", paymentMethod: paymentMethodLabel(sale.payment_method),
                customer: specified(sale.customer?.customerName), employee: specified(sale.users.name),
            })));
            totals.amount = total.toNumber();
            totals.units = sales.reduce((sum, sale) => sum + saleUnits(sale), 0);
        } else if (type === "products") {
            const products = productMetrics(sales, total);
            rows.push(...products.map(product => ({ name: product.name, units: product.units, amount: product.amount, participation: product.participation })));
            const productAmount = decimalSum(sales.flatMap(sale => sale.sale_items.map(item => item.subtotal)));
            totals.amount = productAmount.toNumber();
            totals.units = products.reduce((sum, product) => sum + product.units, 0);
            totals.participation = total.isZero() ? 0 : productAmount.dividedBy(total).times(100).toNumber();
        } else {
            const customers = customerMetrics(sales);
            rows.push(...customers.map(customer => ({ name: customer.name, amount: customer.amount, units: customer.units, days: customer.days })));
            totals.amount = salesTotal(sales.filter(sale => sale.customer !== null)).toNumber();
            totals.units = customers.reduce((sum, customer) => sum + customer.units, 0);
        }
    } else if (type === "expenses") {
        const [expenses, undated] = await Promise.all([
            tx.bill.findMany({ where: { date: calendarRange(filter) }, select: expenseSelect, orderBy: [{ date: "desc" }, { id: "desc" }] }),
            tx.bill.count({ where: { date: null } }),
        ]);
        rows.push(...expenses.map(expense => ({
            date: expense.date!.toISOString().slice(0, 10), category: specified(expense.category),
            description: specified(expense.description), amount: expense.amount.toNumber(), employee: specified(expense.users.name),
        })));
        totals.amount = decimalSum(expenses.map(expense => expense.amount)).toNumber();
        notices.push(...missingDateNotice(undated, "egresos"));
    } else if (type === "salaries") {
        const [salaries, undated] = await Promise.all([
            tx.salary.findMany({ where: { payDate: calendarRange(filter) }, select: salarySelect, orderBy: [{ payDate: "desc" }, { id: "desc" }] }),
            tx.salary.count({ where: { payDate: null } }),
        ]);
        rows.push(...salaries.map(salary => ({
            date: salary.payDate!.toISOString().slice(0, 10), employee: specified(salary.users.name),
            period: specified(salary.period), amount: salary.amount.toNumber(),
        })));
        totals.amount = decimalSum(salaries.map(salary => salary.amount)).toNumber();
        notices.push(...missingDateNotice(undated, "salarios"));
    } else {
        const debts = await tx.debtors.findMany({
            where: { status: "DEBT", paidAt: null, amount: { gt: 0 }, sales: { status: "DEBT", createdAt: timestampRange(filter) } },
            select: { id: true, amount: true, customer: { select: { customerName: true } }, sales: { select: { createdAt: true } } },
            orderBy: [{ sales: { createdAt: "asc" } }, { id: "asc" }],
        });
        const today = businessDate();
        rows.push(...debts.map(debt => ({
            id: debt.id, customer: specified(debt.customer.customerName), date: debt.sales.createdAt.toISOString(),
            amount: debt.amount.toNumber(), ageDays: Math.max(0, calendarDays(businessDate(debt.sales.createdAt), today)),
        })));
        totals.amount = decimalSum(debts.map(debt => debt.amount)).toNumber();
        notices.push("Saldo pendiente actual de los fiados originados en el periodo. No representa el saldo histórico al cierre; la antigüedad se calcula a la fecha de consulta.");
    }
    return { rows, totals, notices };
}

async function readReport(input: unknown, exportAll: boolean): Promise<AnalyticsResult<ReportData>> {
    try {
        if ((await auth())?.user?.role !== "ADMIN") return permissionError;
        const parsed = AnalyticsReportSchema.safeParse(input);
        if (!parsed.success) return filterError;
        const { type, page: requestedPage, ...filter } = parsed.data;
        const period = analyticsPeriod(filter);
        const snapshot = await prisma.$transaction(tx => reportSnapshot(tx, filter, type), {
            isolationLevel: "RepeatableRead", timeout: 30_000,
        });
        const page = exportAll ? 1 : Math.min(requestedPage, Math.max(1, Math.ceil(snapshot.rows.length / REPORT_PAGE_SIZE)));
        return { success: true, data: {
            type, period, generatedAt: new Date().toISOString(), notices: snapshot.notices,
            columns: reportColumns[type], totals: snapshot.totals, totalRows: snapshot.rows.length,
            rows: exportAll ? snapshot.rows : snapshot.rows.slice((page - 1) * REPORT_PAGE_SIZE, page * REPORT_PAGE_SIZE),
            page, pageSize: REPORT_PAGE_SIZE,
        } };
    } catch {
        return queryError;
    }
}

export async function getReport(input: unknown): Promise<AnalyticsResult<ReportData>> {
    return readReport(input, false);
}
export async function getReportExport(input: unknown): Promise<AnalyticsResult<ReportData>> {
    return readReport(input, true);
}
