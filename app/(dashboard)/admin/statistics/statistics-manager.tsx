"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnalyticsPeriodFilter } from "@/components/analytics-period-filter";
import {
    analyticsUrl, businessDateTimeLabel, calendarDateLabel, money, REPORT_PAGE_SIZE,
    type AmountGroup, type AnalyticsFilter, type AnalyticsResult, type Comparison,
    type CustomerMetric, type ProductMetric, type StatisticsData,
} from "@/lib/analytics";

type Props = { filter: AnalyticsFilter; result: AnalyticsResult<StatisticsData> };
const number = (value: number) => new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(value);
const percent = (value: number) => new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(value) + "%";

export default function StatisticsManager({ filter, result }: Props) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const reportLink = (type: string) => analyticsUrl("/admin/reports", filter, { type });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Estadísticas</h1>
                    <p className="text-sm text-muted-foreground mt-1">Ventas pagadas y registros del negocio para apoyar tus decisiones comerciales.</p>
                </div>
                <Button asChild variant="outline" className="min-h-10">
                    <Link href={reportLink("sales")}>Ver reportes</Link>
                </Button>
            </div>

            <AnalyticsPeriodFilter filter={filter} pending={pending} />

            {!result.success ? (
                <Card className="p-4 md:p-6 gap-3" role="alert">
                    <h2 className="font-semibold">No se pudieron cargar las estadísticas</h2>
                    <p className="text-sm">{result.message}</p>
                    <div>
                        <Button disabled={pending} onClick={() => startTransition(() => router.refresh())} className="min-h-10">
                            {pending ? "Reintentando…" : "Reintentar"}
                        </Button>
                    </div>
                </Card>
            ) : (
                <StatisticsContent data={result.data} reportLink={reportLink} />
            )}

            <section className="rounded-xl border bg-card p-4 md:p-5 space-y-1" aria-label="Estado de predicción">
                <h2 className="text-sm font-semibold">Predicción pendiente de historial</h2>
                <p className="text-sm text-muted-foreground">Esta beta muestra estadísticas descriptivas y reportes. El modelo de predicción estará pendiente hasta contar con historial suficiente.</p>
            </section>
        </div>
    );
}

function StatisticsContent({ data, reportLink }: { data: StatisticsData; reportLink: (type: string) => string }) {
    const previous = calendarDateLabel(data.period.previousFrom) + " al " + calendarDateLabel(data.period.previousTo);
    return (
        <>
            <div className="space-y-2">
                <p className="text-sm font-medium">
                    {calendarDateLabel(data.period.from)} al {calendarDateLabel(data.period.to)}
                </p>
                <p className="text-sm text-muted-foreground max-w-prose">
                    Solo ventas pagadas. Se atribuyen a su fecha de registro y reflejan su estado actual; no existe una fecha general de cobro.
                </p>
                {data.period.includesToday && (
                    <p role="status" className="text-sm font-medium text-amber-800 bg-amber-50 rounded-md px-3 py-2">
                        El periodo incluye el día en curso. Sus resultados todavía están incompletos.
                    </p>
                )}
                {data.notices.map((notice, index) => <p key={index} className="text-sm text-muted-foreground">{notice}</p>)}
                <p className="text-xs text-muted-foreground">
                    Actualizado: <time dateTime={data.generatedAt}>{businessDateTimeLabel(data.generatedAt)}</time>
                </p>
            </div>

            <Card className="p-4 md:p-6 gap-4">
                <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-5">
                    <Metric title="Ventas pagadas" value={money(data.paidAmount)}>
                        <ComparisonText comparison={data.amountComparison} monetary />
                        {data.paidRecords === 0 && <span>Sin ventas pagadas en este periodo.</span>}
                    </Metric>
                    <Metric title="Unidades vendidas" value={number(data.units)}>
                        <ComparisonText comparison={data.unitsComparison} />
                    </Metric>
                    <Metric title="Egresos registrados" value={money(data.expensesAmount)}>
                        <span>{number(data.expensesCount)} registros. Se presentan por separado.</span>
                    </Metric>
                    <Metric title="Salarios registrados" value={money(data.salariesAmount)}>
                        <span>{number(data.salariesCount)} pagos. Se presentan por separado.</span>
                    </Metric>
                </dl>
                <p className="text-xs text-muted-foreground border-t pt-3">Comparación de ventas y unidades con el periodo anterior: {previous}.</p>
            </Card>

            <GroupSection title="Evolución diaria" groups={data.daily} dateLabels
                description="Importe y unidades de ventas pagadas por fecha de registro." empty="Sin ventas pagadas para mostrar la evolución diaria."
                href={reportLink("sales")} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProductRanking title="Productos principales por importe" products={data.products} order="amount" href={reportLink("products")} />
                <ProductRanking title="Productos principales por unidades" products={data.products} order="units" href={reportLink("products")} />
                <GroupSection title="Actividad por hora" groups={data.hourly} description="Hora de registro en America/Mexico_City."
                    empty="Sin ventas pagadas para mostrar la actividad por hora." href={reportLink("sales")} />
                <GroupSection title="Actividad por día de la semana" groups={data.weekdays} description="Importe y unidades acumulados del periodo."
                    empty="Sin ventas pagadas para mostrar la actividad por día." href={reportLink("sales")} />
                <GroupSection title="Formas de pago" groups={data.paymentMethods} empty="Sin ventas pagadas para mostrar formas de pago." href={reportLink("sales")} />
                <GroupSection title="Tipos de venta" groups={data.sourceTypes} empty="Sin ventas pagadas para mostrar tipos de venta." href={reportLink("sales")} />
                <GroupSection title="Egresos por categoría" groups={data.expenses} description="Según la fecha calendario registrada. No calcula utilidad."
                    empty="Sin egresos registrados en este periodo." href={reportLink("expenses")} showUnits={false} />
                <GroupSection title="Salarios por empleado" groups={data.salaries} description="Según la fecha calendario de pago."
                    empty="Sin salarios registrados en este periodo." href={reportLink("salaries")} showUnits={false} />
            </div>

            <CustomersSection key={data.period.from + ":" + data.period.to} customers={data.customers} count={data.identifiedCustomers} href={reportLink("customers")} />
        </>
    );
}

function Metric({ title, value, children }: { title: string; value: string; children: ReactNode }) {
    return (
        <div className="min-w-0 space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">{title}</dt>
            <dd className="text-2xl font-bold tabular-nums break-words">{value}</dd>
            <dd className="flex flex-col gap-1 text-xs text-muted-foreground">{children}</dd>
        </div>
    );
}

function ComparisonText({ comparison, monetary = false }: { comparison: Comparison; monetary?: boolean }) {
    const difference = (comparison.difference > 0 ? "+" : "") + (monetary ? money(comparison.difference) : number(comparison.difference));
    return <span>{difference} frente al anterior · {comparison.percentage === null ? "Sin base de comparación" : (comparison.percentage > 0 ? "+" : "") + percent(comparison.percentage)}</span>;
}

function SectionHeader({ title, description, href }: { title: string; description?: string; href: string }) {
    return (
        <div className="flex flex-wrap justify-between items-start gap-2">
            <div className="min-w-0">
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            <Link href={href} aria-label={"Ver reporte: " + title} className="text-sm font-medium underline underline-offset-4 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Ver reporte</Link>
        </div>
    );
}

function GroupSection({ title, groups, description, empty, href, dateLabels = false, showUnits = true }: {
    title: string; groups: AmountGroup[]; description?: string; empty: string; href: string; dateLabels?: boolean; showUnits?: boolean;
}) {
    const populated = groups.some(group => group.records > 0 || group.amount !== 0 || group.units !== 0);
    const maximum = Math.max(...groups.map(group => Math.abs(group.amount)), 0);
    return (
        <Card className="p-4 md:p-6 gap-4 min-w-0">
            <SectionHeader title={title} description={description} href={href} />
            {!populated ? <p className="text-sm text-muted-foreground">{empty}</p> : (
                <dl className="space-y-3 max-h-96 overflow-y-auto pr-1" aria-label={title}>
                    {groups.map((group, index) => (
                        <div key={group.label + index} className="space-y-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                                <dt className="font-medium break-words min-w-0">{dateLabels && /^\d{4}-\d{2}-\d{2}$/.test(group.label) ? calendarDateLabel(group.label) : group.label}</dt>
                                <dd className="tabular-nums">{money(group.amount)}</dd>
                            </div>
                            <dd className="text-xs text-muted-foreground tabular-nums">
                                {showUnits ? number(group.units) + " unidades · " : ""}{number(group.records)} registros
                            </dd>
                            <dd aria-hidden="true" className="h-1.5 bg-muted rounded-sm overflow-hidden">
                                <div className="h-full bg-primary rounded-sm" style={{ width: (maximum === 0 ? 0 : Math.abs(group.amount) / maximum * 100) + "%" }} />
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
        </Card>
    );
}

function ProductRanking({ title, products, order, href }: { title: string; products: ProductMetric[]; order: "amount" | "units"; href: string }) {
    const ranked = [...products].sort((left, right) => right[order] - left[order] || left.id - right.id).slice(0, 10);
    return (
        <Card className="p-4 md:p-6 gap-4 min-w-0">
            <SectionHeader title={title} description="Hasta 10 productos. Importes calculados con subtotales históricos." href={href} />
            {ranked.length === 0 ? <p className="text-sm text-muted-foreground">Sin productos en ventas pagadas para este periodo.</p> : (
                <ol className="divide-y">
                    {ranked.map(product => (
                        <li key={product.id} className="py-2.5 flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
                            <span className="font-medium break-words min-w-0">{product.name}</span>
                            <span className="tabular-nums shrink-0">{order === "amount" ? money(product.amount) : number(product.units) + " unidades"}</span>
                            <span className="w-full text-xs text-muted-foreground tabular-nums">
                                {order === "amount" ? number(product.units) + " unidades" : money(product.amount)} · {percent(product.participation)} de las ventas
                            </span>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}

function CustomersSection({ customers, count, href }: { customers: CustomerMetric[]; count: number; href: string }) {
    const [requestedPage, setRequestedPage] = useState(1);
    const pages = Math.max(1, Math.ceil(customers.length / REPORT_PAGE_SIZE));
    const page = Math.min(requestedPage, pages);
    const start = (page - 1) * REPORT_PAGE_SIZE;
    const visible = customers.slice(start, start + REPORT_PAGE_SIZE);

    return (
        <Card className="p-4 md:p-6 gap-4 min-w-0">
            <SectionHeader title="Clientes identificados" description={number(count) + " clientes con ventas pagadas. Los días cuentan fechas distintas con compras registradas."} href={href} />
            {customers.length === 0 ? <p className="text-sm text-muted-foreground">Sin clientes identificados con ventas pagadas en este periodo.</p> : (
                <>
                    <Table>
                        <TableHeader><TableRow>
                            <TableHead scope="col">Cliente</TableHead>
                            <TableHead scope="col" className="text-right">Importe pagado</TableHead>
                            <TableHead scope="col" className="text-right">Unidades</TableHead>
                            <TableHead scope="col" className="text-right">Días con compras</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>{visible.map(customer => (
                            <TableRow key={customer.id}>
                                <TableCell className="whitespace-normal min-w-32 break-words">{customer.name}</TableCell>
                                <TableCell className="text-right tabular-nums">{money(customer.amount)}</TableCell>
                                <TableCell className="text-right tabular-nums">{number(customer.units)}</TableCell>
                                <TableCell className="text-right tabular-nums">{number(customer.days)}</TableCell>
                            </TableRow>
                        ))}</TableBody>
                    </Table>
                    <nav aria-label="Paginación de clientes" className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">Mostrando {start + 1}–{Math.min(start + REPORT_PAGE_SIZE, customers.length)} de {customers.length}</p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="min-h-10" disabled={page === 1} onClick={() => setRequestedPage(page - 1)}>Anterior</Button>
                            <span className="text-sm tabular-nums">Página {page} de {pages}</span>
                            <Button variant="outline" className="min-h-10" disabled={page === pages} onClick={() => setRequestedPage(page + 1)}>Siguiente</Button>
                        </div>
                    </nav>
                </>
            )}
        </Card>
    );
}
