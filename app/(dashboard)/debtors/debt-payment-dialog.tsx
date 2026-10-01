"use client";

import { useId, useState } from "react";
import { PaymentMethod } from "@/app/generated/prisma/enums";
import { payAccount, type Debtor } from "@/lib/actions/debts";
import type { Sale } from "@/lib/actions/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DebtPaymentDialog({ debtor, onAccountClose }: { debtor: Debtor; onAccountClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [cashReceived, setCashReceived] = useState("");
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState("");
  const inputId = useId();
  const changeId = useId();
  const errorId = useId();
  const customerName = debtor.customer?.customerName || "Cliente";
  const sales = (debtor.sales as unknown as Sale[]) || [];
  const totalCents = sales.reduce((sum, sale) => sum + Math.round(Number(sale.total || 0) * 100), 0);
  const total = (totalCents / 100).toFixed(2);

  const value = cashReceived.trim().replace(",", ".");
  let cashReceivedCents: number | null = null;
  if (value !== "") {
    if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value)) {
      cashReceivedCents = NaN;
    } else {
      const [whole, decimals = ""] = value.split(".");
      const cents = Number(whole || "0") * 100 + Number(decimals.padEnd(2, "0"));
      cashReceivedCents = Number.isSafeInteger(cents) ? cents : NaN;
    }
  }
  const cashReceivedInvalid = cashReceivedCents !== null && Number.isNaN(cashReceivedCents);
  const changeCents = cashReceivedCents === null || cashReceivedInvalid ? null : cashReceivedCents - totalCents;
  const cashReceivedInsufficient = changeCents !== null && changeCents < 0;

  const handleOpenChange = (nextOpen: boolean) => {
    if (settling) return;
    if (!nextOpen && cashDialogOpen) {
      setCashDialogOpen(false);
      setError("");
      return;
    }
    setOpen(nextOpen);
    if (!nextOpen) {
      setCashDialogOpen(false);
      setCashReceived("");
      setError("");
      onAccountClose();
    }
  };

  const handlePayAccount = async () => {
    if (settling || (paymentMethod === PaymentMethod.CASH && (changeCents === null || changeCents < 0))) return;
    setSettling(true);
    setError("");
    try {
      const result = await payAccount(debtor.customerID || -1, sales, paymentMethod);
      if (result.msg === "SUCCESS") {
        setOpen(false);
        setCashDialogOpen(false);
        setCashReceived("");
        onAccountClose();
      } else {
        setError("No se pudo registrar el cobro. Revisa la cuenta e inténtalo de nuevo.");
      }
    } catch {
      setError("No se pudo registrar el cobro. Revisa la cuenta e inténtalo de nuevo.");
    } finally {
      setSettling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full">
        Cobrar
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="break-words">
            {cashDialogOpen ? "Cobrar en efectivo" : "Cobrar cuenta de " + customerName}
          </DialogTitle>
          <DialogDescription>
            {cashDialogOpen ? customerName : "Confirma el total y el método de pago para registrar el cobro."}
          </DialogDescription>
        </DialogHeader>

        {cashDialogOpen ? (
          <form onSubmit={(event) => event.preventDefault()} className="flex min-h-0 flex-1 flex-col gap-4">
            <div role="region" aria-label="Datos del pago en efectivo" className="min-h-0 flex-1 overflow-y-auto">
              <label htmlFor={inputId} className="mb-2 block text-sm font-medium">
                Efectivo recibido
              </label>
              <Input
                id={inputId}
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                autoComplete="off"
                autoFocus
                required
                disabled={settling}
                value={cashReceived}
                onChange={(event) => setCashReceived(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
                aria-invalid={cashReceivedInvalid || cashReceivedInsufficient}
                aria-describedby={cashReceivedInvalid || cashReceivedInsufficient ? changeId + " " + errorId : changeId}
                className="h-11 text-base md:text-base"
              />
              <p id={changeId} role="status" className="mt-2 text-sm font-semibold tabular-nums">
                {cashReceivedInsufficient
                  ? "Faltan $" + (-changeCents! / 100).toFixed(2)
                  : "Cambio a entregar: " + (changeCents === null ? "—" : "$" + (changeCents / 100).toFixed(2))}
              </p>
              {(cashReceivedInvalid || cashReceivedInsufficient) && (
                <p id={errorId} role="alert" className="mt-1 text-sm text-destructive">
                  {cashReceivedInvalid
                    ? "Introduce un importe válido con hasta dos decimales, usando punto o coma."
                    : "El monto recibido es menor al total del cobro. Ingresa un monto igual o mayor."}
                </p>
              )}
              {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
            </div>

            <div className="shrink-0 border-t pt-3">
              <div className="flex items-center justify-between gap-2 pb-3 text-lg font-bold">
                <span>Total</span>
                <span className="tabular-nums">{"$" + total}</span>
              </div>
              <Button
                type="button"
                onClick={() => void handlePayAccount()}
                disabled={settling || changeCents === null || changeCents < 0}
                className="h-12 w-full text-base font-bold"
              >
                {settling ? "Registrando cobro..." : "Cobrar $" + total}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={settling}
                onClick={() => { setCashDialogOpen(false); setError(""); }}
                className="mt-2 h-11 w-full"
              >
                Volver a la cuenta
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="min-h-0 overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 py-4">
                <span>Total:</span>
                <p className="tabular-nums">{"$" + total}</p>
                <Select
                  value={paymentMethod}
                  disabled={settling}
                  onValueChange={(method) => {
                    setPaymentMethod(method as PaymentMethod);
                    setCashReceived("");
                    setError("");
                  }}
                >
                  <SelectTrigger aria-label="Método de pago" className="w-full sm:w-45">
                    <SelectValue placeholder="Tipo de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PaymentMethod.TRANSFER}>Transferencia</SelectItem>
                    <SelectItem value={PaymentMethod.CASH}>Efectivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter className="shrink-0">
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={settling} className="h-11 flex-1">Cancelar</Button>
                </DialogClose>
                <Button
                  type="button"
                  disabled={settling}
                  onClick={() => {
                    if (paymentMethod === PaymentMethod.CASH) setCashDialogOpen(true);
                    else void handlePayAccount();
                  }}
                  className="h-11 flex-1"
                >
                  {settling ? "Registrando cobro..." : "Registrar Cobro"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
