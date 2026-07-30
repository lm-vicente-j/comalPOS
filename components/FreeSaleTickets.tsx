"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./ui/popover";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export interface FreeSaleTicket {
    sourceType: string;
    number: number;
    total: number;
}

interface FreeSaleTicketsProps {
    tickets: FreeSaleTicket[];
    activeTicket: number;
    onSelect: (ticketNumber: number) => void;
    onNew: () => void;
    creating: boolean;
}

/**
 * Walk-in accounts, the counterpart of Seatings for customers who take no
 * table and are not registered. Several can be open at once — less common
 * than tables, but a customer buying two things while the next one is
 * already ordering needs its own running total — so the row is built from
 * whatever tickets are actually open instead of a fixed set of slots.
 *
 * The charging happens from "Cerrar cuenta" next to the order list, which
 * already covers tables and customer accounts, so this row is pure
 * selection.
 *
 * Desktop row fits within max-w-2xl: "Nuevo" is always the last chip and,
 * when the tickets don't all fit, the overflow collapses behind a
 * "Mostrar más" button right before it (a popover lists the rest). The fit
 * is measured against a hidden duplicate row, because chips change width
 * with their totals. On mobile the row simply scrolls horizontally.
 */
export default function FreeSaleTickets({
    tickets,
    activeTicket,
    onSelect,
    onNew,
    creating,
}: FreeSaleTicketsProps) {

    const rowRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const [moreOpen, setMoreOpen] = useState(false);
    // How many leading tickets fit the desktop row; the rest go to the
    // "Mostrar más" popover. Starts at "all" and useLayoutEffect corrects
    // it before paint, so there is no clamp flash.
    const [visibleCount, setVisibleCount] = useState(tickets.length);

    useLayoutEffect(() => {
        const computeFit = () => {
            const row = rowRef.current;
            const measure = measureRef.current;
            if (!row || !measure) return;

            const chips = Array.from(measure.querySelectorAll<HTMLElement>("[data-chip='ticket']"));
            const moreBtn = measure.querySelector<HTMLElement>("[data-chip='more']");
            const newBtn = measure.querySelector<HTMLElement>("[data-chip='new']");
            const gap = 8; // gap-2
            const newW = (newBtn?.offsetWidth ?? 0) + gap;
            const moreW = (moreBtn?.offsetWidth ?? 0) + gap;
            const available = row.clientWidth;

            let used = 0;
            let count = 0;
            for (const chip of chips) {
                const w = chip.offsetWidth + gap;
                const isLast = count === chips.length - 1;
                // Reserve room for "Nuevo" always, and for "Mostrar más"
                // whenever this chip is not the last one shown.
                const reserve = newW + (isLast ? 0 : moreW);
                if (used + w + reserve <= available) {
                    used += w;
                    count++;
                } else {
                    break;
                }
            }
            setVisibleCount(count);
        };

        computeFit();
        const observer = new ResizeObserver(computeFit);
        if (rowRef.current) observer.observe(rowRef.current);
        return () => observer.disconnect();
    }, [tickets]);

    const hasOverflow = visibleCount < tickets.length;
    const overflowTickets = tickets.slice(visibleCount);

    const chipClass = (isSelected: boolean) =>
        cn(
            "border text-black flex outline cursor-pointer hover:bg-gray-200 items-center justify-center gap-2 bg-white rounded-sm shrink-0 h-11 px-3 lg:h-10 transition-colors",
            { "bg-amber-300 text-black border-amber-300 hover:bg-amber-400": isSelected }
        );

    const chipContent = (ticket: FreeSaleTicket) => (
        <>
            <span>#{ticket.number}</span>
            <span className="tabular-nums opacity-70">${ticket.total.toFixed(2)}</span>
        </>
    );

    return (
        <div className="relative">
            {/* Hidden duplicate used only to measure chip widths (they vary
                with the totals). Off-flow, so it never affects layout. */}
            <div ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex items-center gap-2">
                {tickets.map((ticket) => (
                    <Button key={ticket.sourceType} data-chip="ticket" className={chipClass(false)} tabIndex={-1}>
                        {chipContent(ticket)}
                    </Button>
                ))}
                <Button data-chip="more" tabIndex={-1} className="border text-black flex outline items-center justify-center gap-1 bg-white rounded-sm shrink-0 h-11 px-3 lg:h-10">
                    Mostrar más
                </Button>
                <Button data-chip="new" tabIndex={-1} className="border text-black flex outline items-center justify-center gap-1 bg-white rounded-sm shrink-0 h-11 px-3 lg:h-10">
                    <Plus className="h-4 w-4" />
                    Nuevo
                </Button>
            </div>

            {/* Mobile: single horizontally-scrollable row of touch-sized
                chips. Desktop: clamped row, overflow goes to "Mostrar más". */}
            <div ref={rowRef} className="flex items-center gap-2 overflow-x-auto pb-1 lg:max-w-2xl lg:overflow-hidden lg:pb-0">
                {tickets.map((ticket, index) => {
                    const isSelected = ticket.number === activeTicket;

                    return (
                        <Button
                            onClick={() => onSelect(ticket.number)}
                            key={ticket.sourceType}
                            // Overflow chips hide only on desktop (lg); the
                            // mobile row keeps scrolling through all of them.
                            className={cn(chipClass(isSelected), { "lg:hidden": index >= visibleCount })}
                        >
                            {chipContent(ticket)}
                        </Button>
                    );
                })}

                {hasOverflow && (
                    <Popover open={moreOpen} onOpenChange={setMoreOpen}>
                        <PopoverTrigger asChild>
                            <Button className="border text-black hidden outline cursor-pointer hover:bg-gray-200 items-center justify-center gap-1 bg-white rounded-sm shrink-0 h-10 px-3 transition-colors lg:inline-flex">
                                Mostrar más
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-56 p-1">
                            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                                {overflowTickets.length} ticket{overflowTickets.length === 1 ? "" : "s"} más
                            </p>
                            <div className="flex flex-col">
                                {overflowTickets.map((ticket) => {
                                    const isSelected = ticket.number === activeTicket;
                                    return (
                                        <button
                                            key={ticket.sourceType}
                                            type="button"
                                            onClick={() => {
                                                onSelect(ticket.number);
                                                setMoreOpen(false);
                                            }}
                                            className={cn(
                                                "flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-gray-100",
                                                { "bg-amber-100 hover:bg-amber-100": isSelected }
                                            )}
                                        >
                                            <span>#{ticket.number}</span>
                                            <span className="tabular-nums opacity-70">${ticket.total.toFixed(2)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                <Button
                    onClick={onNew}
                    disabled={creating}
                    className="border text-black flex outline cursor-pointer hover:bg-gray-200 items-center justify-center gap-1 bg-white rounded-sm shrink-0 h-11 px-3 lg:h-10 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo
                </Button>
            </div>

            {tickets.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                    Sin tickets abiertos. Toca un producto o &quot;Nuevo&quot; para abrir uno.
                </p>
            )}
        </div>
    );
}
