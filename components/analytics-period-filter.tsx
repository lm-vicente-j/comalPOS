"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultAnalyticsFilter, isCalendarDate, type AnalyticsFilter } from "@/lib/analytics";

type Props = { filter: AnalyticsFilter; pending?: boolean };

// Only changing the applied dates resets drafts; router.refresh keeps this key.
export function AnalyticsPeriodFilter(props: Props) {
    return <PeriodInputs key={props.filter.from + ":" + props.filter.to} {...props} />;
}

function PeriodInputs({ filter, pending = false }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const id = useId();
    const [from, setFrom] = useState(filter.from);
    const [to, setTo] = useState(filter.to);
    const [error, setError] = useState("");
    const [navigating, startTransition] = useTransition();
    const busy = pending || navigating;

    function apply(next: AnalyticsFilter) {
        if (!isCalendarDate(next.from) || !isCalendarDate(next.to)) {
            setError("Selecciona una fecha de inicio y una fecha de fin válidas.");
            return;
        }
        if (next.from > next.to) {
            setError("La fecha de inicio debe ser anterior o igual a la fecha de fin.");
            return;
        }
        setError("");
        const query = new URLSearchParams(searchParams.toString());
        query.set("from", next.from);
        query.set("to", next.to);
        query.set("page", "1");
        startTransition(() => router.push(pathname + "?" + query.toString(), { scroll: false }));
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        apply({ from, to });
    }

    function shortcut(days: number) {
        const next = defaultAnalyticsFilter(days);
        setFrom(next.from);
        setTo(next.to);
        apply(next);
    }

    return (
        <section aria-label="Filtros de periodo" aria-busy={busy} className="rounded-xl border bg-card p-4 md:p-5 space-y-3">
            <form onSubmit={submit} className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                    <Label htmlFor={id + "-from"}>Desde</Label>
                    <Input id={id + "-from"} type="date" value={from} required disabled={busy}
                        onChange={event => { setFrom(event.target.value); setError(""); }} />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                    <Label htmlFor={id + "-to"}>Hasta</Label>
                    <Input id={id + "-to"} type="date" value={to} required disabled={busy}
                        onChange={event => { setTo(event.target.value); setError(""); }} />
                </div>
                <Button type="submit" disabled={busy} className="min-h-10 sm:min-w-32">
                    {busy ? "Actualizando…" : "Aplicar periodo"}
                </Button>
            </form>
            <div className="flex flex-wrap gap-2" aria-label="Periodos rápidos">
                <Button type="button" variant="outline" className="min-h-10" disabled={busy} onClick={() => shortcut(1)}>Hoy</Button>
                <Button type="button" variant="outline" className="min-h-10" disabled={busy} onClick={() => shortcut(7)}>Últimos 7 días</Button>
                <Button type="button" variant="outline" className="min-h-10" disabled={busy} onClick={() => shortcut(30)}>Últimos 30 días</Button>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">Fechas inclusivas. Horarios de America/Mexico_City.</p>
        </section>
    );
}
