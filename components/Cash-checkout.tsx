"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// Mobile-first full screen: below lg every cobro takes the whole screen —
// the mobile version of the checkout, not a separate module — and closing
// it lands back on the POS. From lg up the lg: classes restore the regular
// centered dialog. Written mobile-first (instead of max-lg: overrides)
// because Tailwind sorts min-* variants after max-* ones, so max-lg: rules
// would lose against the dialog's own sm:max-w-lg on tablets. Shared with
// the close account dialog so both cobros behave the same.
export const checkoutDialogClasses =
    "top-0 left-0 h-dvh max-h-none w-full max-w-none sm:max-w-none translate-x-0 translate-y-0 rounded-none border-0 " +
    "lg:top-[50%] lg:left-[50%] lg:h-auto lg:max-w-lg lg:translate-x-[-50%] lg:translate-y-[-50%] lg:rounded-lg lg:border";

// Parses what the operator typed; empty or partial input counts as 0.
export function parseCashReceived(value: string): number {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

// Cash math shared by every cobro: the change to hand back once the
// received amount covers the total, or what is still missing.
export function CashChangeHint({ received, total }: { received: number; total: number }) {
    if (received >= total) {
        return (
            <p className="text-base text-emerald-700">
                Cambio a entregar:{" "}
                <span className="text-xl font-bold tabular-nums">${(received - total).toFixed(2)}</span>
            </p>
        );
    }
    return (
        <p className="text-sm text-red-600">
            Efectivo insuficiente, faltan{" "}
            <span className="font-bold tabular-nums">${(total - received).toFixed(2)}</span>
        </p>
    );
}

interface CashCheckoutProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    total: number;
    // What is being charged, e.g. "Taco Pastor" or "Mesa #4".
    concept: string;
    onConfirm: () => Promise<void> | void;
}

export default function CashCheckout({ open, onOpenChange, total, concept, onConfirm }: CashCheckoutProps) {
    // The content mounts per cobro (instead of staying mounted and resetting
    // state in an effect), so every charge starts with a clean input.
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {open && (
                <CashCheckoutContent
                    total={total}
                    concept={concept}
                    onConfirm={onConfirm}
                    onOpenChange={onOpenChange}
                />
            )}
        </Dialog>
    );
}

function CashCheckoutContent({ total, concept, onConfirm, onOpenChange }: Omit<CashCheckoutProps, "open">) {
    const [cashReceived, setCashReceived] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const received = parseCashReceived(cashReceived);
    const enough = received >= total;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!enough || submitting) return;
        setSubmitting(true);
        await onConfirm();
        setSubmitting(false);
    };

    return (
        <DialogContent className={checkoutDialogClasses}>
            <DialogHeader>
                <DialogTitle>Cobrar — {concept}</DialogTitle>
                <DialogDescription>
                    Ingresa el efectivo recibido del cliente.
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2">
                        <span className="text-sm font-semibold text-gray-700">Total a cobrar</span>
                        <span className="text-xl font-bold tabular-nums">${total.toFixed(2)}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label htmlFor="cash-received" className="text-sm font-medium text-gray-700">
                            Efectivo recibido
                        </label>
                        <Input
                            id="cash-received"
                            inputMode="decimal"
                            autoFocus
                            placeholder="0.00"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            className="h-12 text-lg tabular-nums"
                        />
                    </div>

                    <CashChangeHint received={received} total={total} />

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={!enough || submitting}
                            className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            {submitting ? "Cobrando..." : "Cobrar"}
                        </Button>
                    </DialogFooter>
                </form>
        </DialogContent>
    );
}
