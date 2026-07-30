"use client";

import { Button } from "./ui/button";
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
    onCharge: () => void;
    creating: boolean;
}

/**
 * Walk-in accounts, the counterpart of Seatings for customers who take no
 * table and are not registered. Several can be open at once — less common
 * than tables, but a customer buying two things while the next one is
 * already ordering needs its own running total — so the row is built from
 * whatever tickets are actually open instead of a fixed set of slots.
 */
export default function FreeSaleTickets({
    tickets,
    activeTicket,
    onSelect,
    onNew,
    onCharge,
    creating,
}: FreeSaleTicketsProps) {

    const active = tickets.find((t) => t.number === activeTicket);

    return (
        <>
            {/* Same scrollable chip row as the tables, which already handles
                an arbitrary number of chips on a narrow phone. */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:max-w-2xl lg:overflow-visible lg:pb-0">
                {tickets.map((ticket) => {
                    const isSelected = ticket.number === activeTicket;

                    return (
                        <Button
                            onClick={() => onSelect(ticket.number)}
                            key={ticket.sourceType}
                            className={cn(
                                "border text-black flex outline cursor-pointer hover:bg-gray-200 items-center justify-center gap-2 bg-white rounded-sm shrink-0 h-11 px-3 lg:h-10 transition-colors",
                                {
                                    "bg-amber-300 text-black border-amber-300 hover:bg-amber-400": isSelected,
                                }
                            )}
                        >
                            <span>#{ticket.number}</span>
                            <span className="tabular-nums opacity-70">${ticket.total.toFixed(2)}</span>
                        </Button>
                    );
                })}

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

            <Button
                disabled={activeTicket === 0}
                className={cn(
                    "cursor-pointer mt-3 w-full lg:mt-5 lg:w-fit",
                    // Like "Cerrar Mesa": on mobile the button only shows up
                    // once there is something to charge.
                    { "hidden lg:inline-flex": activeTicket === 0 }
                )}
                onClick={onCharge}
            >
                Cobrar Ticket {activeTicket > 0 && `#${activeTicket}`}
                {active && active.total > 0 && ` — $${active.total.toFixed(2)}`}
            </Button>
        </>
    );
}
