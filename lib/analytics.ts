import { CUSTOMER_PREFIX, FREE_SALE_SOURCE, TABLE_PREFIX, isFreeTicket } from "@/lib/pos-source";

export const BUSINESS_TIME_ZONE = "America/Mexico_City";
export const REPORT_PAGE_SIZE = 50;
export const REPORT_NAMES = {
    sales: "Ventas", products: "Productos", expenses: "Egresos",
    salaries: "Salarios", customers: "Clientes", debts: "Deudas",
} as const;
export type ReportType = keyof typeof REPORT_NAMES;
export type AnalyticsFilter = { from: string; to: string };
export type AnalyticsPeriod = AnalyticsFilter & {
    previousFrom: string; previousTo: string; days: number; includesToday: boolean; today: string;
};
export type AnalyticsResult<T> =
    | { success: true; data: T }
    | { success: false; error: "PERMISSION_DENIED" | "INVALID_FILTER" | "QUERY_FAILED"; message: string };
export type Comparison = { previous: number; difference: number; percentage: number | null };
export type AmountGroup = { label: string; amount: number; units: number; records: number };
export type ProductMetric = { id: number; name: string; amount: number; units: number; participation: number };
export type CustomerMetric = { id: number; name: string; amount: number; units: number; days: number };
export type StatisticsData = {
    period: AnalyticsPeriod; generatedAt: string; notices: string[];
    paidAmount: number; units: number; paidRecords: number; identifiedCustomers: number;
    expensesAmount: number; expensesCount: number; salariesAmount: number; salariesCount: number;
    amountComparison: Comparison; unitsComparison: Comparison;
    daily: AmountGroup[]; hourly: AmountGroup[]; weekdays: AmountGroup[];
    products: ProductMetric[]; paymentMethods: AmountGroup[]; sourceTypes: AmountGroup[];
    expenses: AmountGroup[]; salaries: AmountGroup[]; customers: CustomerMetric[];
};
export type ReportColumn = { key: string; label: string; kind: "text" | "money" | "integer" | "date" | "datetime" | "percent" };
export type ReportRow = Record<string, string | number | null>;
export type ReportData = {
    type: ReportType; period: AnalyticsPeriod; generatedAt: string; notices: string[];
    columns: ReportColumn[]; rows: ReportRow[]; totals: ReportRow;
    totalRows: number; page: number; pageSize: number;
};

const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
function parts(date: Date) {
    return Object.fromEntries(dateParts.formatToParts(date).map(part => [part.type, part.value]));
}
export function businessDate(date = new Date()): string {
    const p = parts(date);
    return `${p.year}-${p.month}-${p.day}`;
}
export function businessHour(date: Date): number { return Number(parts(date).hour); }
export function shiftCalendarDate(value: string, days: number): string {
    const date = new Date(value + "T00:00:00.000Z");
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}
export function calendarDays(from: string, to: string): number {
    return Math.round((Date.parse(to + "T00:00:00.000Z") - Date.parse(from + "T00:00:00.000Z")) / 86400000);
}
export function isCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + "T00:00:00.000Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function defaultAnalyticsFilter(days = 30, now = new Date()): AnalyticsFilter {
    const to = businessDate(now);
    return { from: shiftCalendarDate(to, 1 - days), to };
}
export function analyticsPeriod(filter: AnalyticsFilter, now = new Date()): AnalyticsPeriod {
    const days = calendarDays(filter.from, filter.to) + 1;
    const today = businessDate(now);
    return {
        ...filter, days, today,
        previousFrom: shiftCalendarDate(filter.from, -days),
        previousTo: shiftCalendarDate(filter.from, -1),
        includesToday: filter.from <= today && filter.to >= today,
    };
}
// Resolve midnight in the business zone with Intl; do not depend on the server's zone.
export function businessMidnight(value: string): Date {
    const target = Date.parse(value + "T00:00:00.000Z");
    let instant = target;
    for (let i = 0; i < 3; i++) {
        const p = parts(new Date(instant));
        const observed = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
        instant += target - observed;
    }
    return new Date(instant);
}
export function timestampRange(filter: AnalyticsFilter) {
    return { gte: businessMidnight(filter.from), lt: businessMidnight(shiftCalendarDate(filter.to, 1)) };
}
// PostgreSQL @db.Date values are calendar dates, not instants in the business zone.
export function calendarRange(filter: AnalyticsFilter) {
    return { gte: new Date(filter.from + "T00:00:00.000Z"), lt: new Date(shiftCalendarDate(filter.to, 1) + "T00:00:00.000Z") };
}
export function compareAmounts(current: number, previous: number): Comparison {
    return {
        previous, difference: Number((current - previous).toFixed(2)),
        percentage: previous === 0 ? null : (current - previous) / previous * 100,
    };
}
export function saleOrigin(source: string | null): string {
    if (!source?.trim()) return "Sin especificar";
    if (source.startsWith(TABLE_PREFIX)) return "Mesa";
    if (source.startsWith(CUSTOMER_PREFIX) || source.startsWith("CL-")) return "Cliente";
    if (source === FREE_SALE_SOURCE || isFreeTicket(source)) return "Venta libre";
    return source;
}
export function paymentMethodLabel(method: string | null): string {
    if (method === "CASH") return "Efectivo";
    if (method === "TRANSFER") return "Transferencia";
    return method?.trim() || "Sin especificar";
}
export function specified(value: string | null | undefined): string { return value?.trim() || "Sin especificar"; }
export function money(value: number): string {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}
export function calendarDateLabel(value: string): string {
    return new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", dateStyle: "medium" }).format(new Date(value + "T00:00:00.000Z"));
}
export function businessDateTimeLabel(value: string): string {
    return new Intl.DateTimeFormat("es-MX", { timeZone: BUSINESS_TIME_ZONE, dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
export function formatReportCell(value: string | number | null | undefined, kind: ReportColumn["kind"]): string {
    if (value === null || value === undefined) return "Sin especificar";
    if (kind === "money") return money(Number(value));
    if (kind === "percent") return Number(value).toFixed(1) + "%";
    if (kind === "date") return calendarDateLabel(String(value));
    if (kind === "datetime") return businessDateTimeLabel(String(value));
    return String(value);
}
const csvMoneyFormatter = new Intl.NumberFormat("en-US", {
    useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2,
});
function csvCell(value: string | number | null | undefined, column: ReportColumn): string {
    let text = "";
    if (value !== null && value !== undefined) {
        if (typeof value === "number") text = column.kind === "money" ? csvMoneyFormatter.format(value) : String(value);
        else {
            text = column.kind === "datetime" ? businessDateTimeLabel(value) : value;
            // Neutralize spreadsheet formulas in text, including whitespace/control prefixes.
            if (/^[\s\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
        }
    }
    return '"' + text.replace(/"/g, '""') + '"';
}
export function reportCsv(report: ReportData): string {
    const lines = [
        report.columns.map(column => csvCell(column.label, { ...column, kind: "text" })).join(","),
        ...report.rows.map(row => report.columns.map(column => csvCell(row[column.key], column)).join(",")),
        report.columns.map((column, index) => csvCell(index === 0 ? "TOTAL" : report.totals[column.key], column)).join(","),
    ];
    return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
export function analyticsUrl(path: string, filter: AnalyticsFilter, extras: Record<string, string> = {}): string {
    return path + "?" + new URLSearchParams({ ...filter, ...extras }).toString();
}
