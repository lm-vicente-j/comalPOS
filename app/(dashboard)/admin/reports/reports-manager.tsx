"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Download, Loader2, Printer, RefreshCw } from "lucide-react";
import { AnalyticsPeriodFilter } from "@/components/analytics-period-filter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableFooter, TableRow } from "@/components/ui/table";
import { getReportExport } from "@/lib/actions/analytics";
import {
    analyticsUrl, businessDateTimeLabel, calendarDateLabel, formatReportCell,
    REPORT_NAMES, REPORT_PAGE_SIZE, reportCsv,
    type AnalyticsFilter, type AnalyticsResult, type ReportColumn, type ReportData,
} from "@/lib/analytics";

type Props = {
    filter: AnalyticsFilter;
    type: string;
    page: number | null;
    result: AnalyticsResult<ReportData>;
};
type ExportMode = "csv" | "print";

function reportExplanation(type: string): string {
    if (type === "debts") {
        return "Saldo pendiente actual de fiados originados en el periodo. Excluye ventas canceladas y no reconstruye saldos históricos.";
    }
    if (type === "expenses" || type === "salaries") {
        return "Se respetan las fechas calendario registradas. Egresos y salarios se presentan por separado, sin calcular utilidad.";
    }
    return "Solo ventas pagadas, según su fecha de registro y estado actual. No existe una fecha general de cobro.";
}

function numericColumn(column: ReportColumn): boolean {
    return column.kind === "money" || column.kind === "integer" || column.kind === "percent";
}

function ReportTable({ report }: { report: ReportData }) {
    return (
        <Table className="tabular-nums">
            <caption className="sr-only">Reporte de {REPORT_NAMES[report.type]} del periodo seleccionado</caption>
            <TableHeader>
                <TableRow>
                    {report.columns.map(column => (
                        <TableHead key={column.key} scope="col" className={numericColumn(column) ? "text-right" : undefined}>
                            {column.label}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {report.rows.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={report.columns.length} className="h-28 whitespace-normal text-center text-muted-foreground">
                            {report.totalRows === 0
                                ? "No hay registros para este reporte en el periodo seleccionado."
                                : "No hay registros en esta página. Regresa a una página anterior."}
                        </TableCell>
                    </TableRow>
                ) : report.rows.map((row, index) => (
                    <TableRow key={String(row.id ?? row.name ?? index) + "-" + index} data-report-row>
                        {report.columns.map(column => (
                            <TableCell key={column.key} className={numericColumn(column)
                                ? "text-right tabular-nums"
                                : column.kind === "text" ? "max-w-72 whitespace-pre-line break-words" : undefined}>
                                {formatReportCell(row[column.key], column.kind)}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
            <TableFooter>
                <TableRow>
                    {report.columns.map((column, index) => (
                        <TableCell key={column.key} className={numericColumn(column) ? "text-right tabular-nums" : "whitespace-normal"}>
                            {index === 0 ? "Total del periodo"
                                : report.totals[column.key] === undefined || report.totals[column.key] === null ? ""
                                    : formatReportCell(report.totals[column.key], column.kind)}
                        </TableCell>
                    ))}
                </TableRow>
            </TableFooter>
        </Table>
    );
}

function ReportNotices({ report }: { report: ReportData }) {
    if (report.notices.length === 0) return null;
    return (
        <ul className="space-y-1 rounded-md border bg-amber-50 p-3 text-sm text-amber-900" aria-label="Avisos del reporte">
            {report.notices.map((notice, index) => <li key={index}>{notice}</li>)}
        </ul>
    );
}

function PrintReport({ report }: { report: ReportData }) {
    return (
        <section id="analytics-print-report" aria-label="Reporte completo para impresión">
            <header className="space-y-2 mb-5">
                <h1 className="text-2xl font-semibold">Comal POS · Reporte de {REPORT_NAMES[report.type]}</h1>
                <p>Periodo: {calendarDateLabel(report.period.from)} al {calendarDateLabel(report.period.to)}</p>
                <p className="text-sm">Generado: {businessDateTimeLabel(report.generatedAt)} · America/Mexico_City · Importes en MXN</p>
                <p className="text-sm">{reportExplanation(report.type)}</p>
                {report.period.includesToday && <p className="text-sm">Incluye el día en curso; sus resultados aún pueden cambiar.</p>}
                <p className="text-sm">{report.totalRows} registros · Totales de todo el periodo</p>
            </header>
            <ReportNotices report={report} />
            <ReportTable report={report} />
        </section>
    );
}

export default function ReportsManager({ filter, type, page, result }: Props) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [busy, setBusy] = useState<ExportMode | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [lastExport, setLastExport] = useState<ExportMode>("csv");
    const [printReport, setPrintReport] = useState<ReportData | null>(null);
    const mounted = useRef(true);
    const report = result.success ? result.data : null;
    const validType = Object.hasOwn(REPORT_NAMES, type);

    useEffect(() => {
        mounted.current = true;
        return () => { mounted.current = false; };
    }, []);

    useEffect(() => {
        if (!printReport) return;
        let secondFrame = 0;
        const cleanPrint = () => {
            document.body.classList.remove("analytics-printing");
            setPrintReport(null);
            setBusy(null);
        };
        document.body.classList.add("analytics-printing");
        window.addEventListener("afterprint", cleanPrint);
        // The portal must be committed before asking the browser to print its full snapshot.
        const firstFrame = window.requestAnimationFrame(() => {
            secondFrame = window.requestAnimationFrame(() => {
                try {
                    window.print();
                } catch {
                    cleanPrint();
                    setExportError("No se pudo abrir la impresión. Vuelve a intentarlo.");
                }
            });
        });
        return () => {
            window.cancelAnimationFrame(firstFrame);
            window.cancelAnimationFrame(secondFrame);
            window.removeEventListener("afterprint", cleanPrint);
            document.body.classList.remove("analytics-printing");
        };
    }, [printReport]);

    const navigate = (nextType: string, nextPage: number) => {
        setExportError(null);
        startTransition(() => router.push(analyticsUrl("/admin/reports", filter, { type: nextType, page: String(nextPage) })));
    };

    const exportReport = async (mode: ExportMode) => {
        setLastExport(mode);
        setBusy(mode);
        setExportError(null);
        try {
            const response = await getReportExport({ ...filter, type });
            if (!mounted.current) return;
            if (!response.success) {
                setExportError(response.message);
                setBusy(null);
                return;
            }
            if (mode === "print") {
                setPrintReport(response.data);
                return;
            }
            const blob = new Blob([reportCsv(response.data)], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `comal-${response.data.type}-${response.data.period.from}-${response.data.period.to}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            setBusy(null);
        } catch {
            if (mounted.current) {
                setExportError(mode === "csv"
                    ? "No se pudo preparar el CSV. Vuelve a intentarlo."
                    : "No se pudo preparar la impresión. Vuelve a intentarlo.");
                setBusy(null);
            }
        }
    };

    const totalPages = report ? Math.max(1, Math.ceil(report.totalRows / REPORT_PAGE_SIZE)) : 1;
    const currentPage = report?.page ?? page ?? 1;
    const firstRecord = report && report.rows.length > 0 ? (currentPage - 1) * REPORT_PAGE_SIZE + 1 : 0;
    const lastRecord = report && report.rows.length > 0 ? firstRecord + report.rows.length - 1 : 0;
    const controlsPending = pending || busy !== null;

    return (
        <div className="min-w-0 space-y-6" data-testid="reports-manager" aria-busy={controlsPending}>
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        Consulta los registros del negocio y exporta el periodo completo para tomar decisiones.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => void exportReport("csv")} disabled={!report || controlsPending}>
                        {busy === "csv" ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
                        {busy === "csv" ? "Preparando CSV..." : "Exportar CSV"}
                    </Button>
                    <Button variant="outline" onClick={() => void exportReport("print")} disabled={!report || controlsPending}>
                        {busy === "print" ? <Loader2 className="animate-spin" aria-hidden /> : <Printer aria-hidden />}
                        {busy === "print" ? "Preparando impresión..." : "Imprimir / PDF"}
                    </Button>
                </div>
            </header>

            <div className="space-y-4">
                <div className="w-full sm:max-w-xs space-y-2">
                    <Label htmlFor="analytics-report-type">Reporte</Label>
                    <Select value={validType ? type : ""} onValueChange={nextType => navigate(nextType, 1)} disabled={controlsPending}>
                        <SelectTrigger id="analytics-report-type" className="w-full" aria-invalid={!validType}>
                            <SelectValue placeholder="Selecciona un reporte" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(REPORT_NAMES).map(([value, name]) => <SelectItem key={value} value={value}>{name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <AnalyticsPeriodFilter filter={filter} pending={controlsPending} />
            </div>

            {exportError && (
                <div role="alert" className="flex flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
                    <p>{exportError}</p>
                    <Button variant="outline" onClick={() => void exportReport(lastExport)} disabled={controlsPending}>
                        <RefreshCw aria-hidden /> {lastExport === "csv" ? "Reintentar exportación" : "Reintentar impresión"}
                    </Button>
                </div>
            )}

            {!result.success ? (
                <div role="alert" className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-medium">No se pudo consultar el reporte.</p>
                    <p>{result.message}</p>
                    <Button variant="outline" onClick={() => startTransition(() => router.refresh())} disabled={controlsPending}>
                        <RefreshCw aria-hidden /> {pending ? "Consultando..." : "Reintentar"}
                    </Button>
                </div>
            ) : report && (
                <section className="min-w-0 space-y-4" aria-labelledby="report-title">
                    <div className="space-y-1">
                        <h2 id="report-title" className="text-lg font-semibold">{REPORT_NAMES[report.type]}</h2>
                        <p className="text-sm">
                            {calendarDateLabel(report.period.from)} al {calendarDateLabel(report.period.to)}
                        </p>
                        <p className="max-w-3xl text-sm text-muted-foreground">{reportExplanation(report.type)}</p>
                        {report.period.includesToday && <p className="text-sm text-amber-800">Incluye el día en curso; sus resultados aún pueden cambiar.</p>}
                        <p className="text-xs text-muted-foreground">
                            Actualizado: {businessDateTimeLabel(report.generatedAt)} · America/Mexico_City · Importes en MXN
                        </p>
                    </div>
                    <ReportNotices report={report} />
                    <div className="min-w-0 rounded-md border bg-background">
                        <ReportTable report={report} />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1 text-sm text-muted-foreground" aria-live="polite">
                            <p>Mostrando {firstRecord}–{lastRecord} de {report.totalRows} registros · {REPORT_PAGE_SIZE} por página</p>
                            <p>CSV e impresión incluyen todos los registros y los totales del periodo.</p>
                        </div>
                        <nav className="flex items-center gap-2" aria-label="Páginas del reporte">
                            <Button variant="outline" onClick={() => navigate(report.type, currentPage - 1)} disabled={currentPage <= 1 || controlsPending}>Anterior</Button>
                            <span className="whitespace-nowrap text-sm tabular-nums">
                                {currentPage <= totalPages ? `Página ${currentPage} de ${totalPages}` : `Página ${currentPage}`}
                            </span>
                            <Button variant="outline" onClick={() => navigate(report.type, currentPage + 1)} disabled={currentPage >= totalPages || controlsPending}>Siguiente</Button>
                        </nav>
                    </div>
                </section>
            )}

            {printReport && typeof document !== "undefined" && createPortal(<PrintReport report={printReport} />, document.body)}
        </div>
    );
}
