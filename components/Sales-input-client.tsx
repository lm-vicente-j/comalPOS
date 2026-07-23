"use client"

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

import { toDebt } from "@/lib/actions/debts";

import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandEmpty,
    CommandInput,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,

} from "@/components/ui/dialog"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { closeAccountAction } from "@/lib/actions/sales";
import { Sale } from "@/lib/actions/sales";
import { Customer } from "@/lib/actions/schemas";
import { searchCustomers } from "@/lib/actions/customers";
import { Banknote, ChevronsUpDown, CreditCard } from "lucide-react";

interface SalesInputProps {
    currentCustomerSales: Sale[];
    setSalesFilter: (val: string) => void;
    query: string;
    setQuery: (val: string) => void;
    clientSelected: boolean;
    setClientSelected: (val: boolean) => void;
    onClientSelect: (name: string) => void;
    tableNumber: number;
    setTableNumber: (val: number) => void;
    setDialogOpen: (val: boolean) => void;
    dialogOpen: boolean;
    customerList: Customer[]
    setCurrentCustomerID: (val: number) => void;
    currentCustomerID: number;
}

// Only the fields the picker needs; matches searchCustomers' selection so the
// SSR list and the server search results share one shape.
type PickerCustomer = { id: number; customerName: string | null; alias: string | null };



export default function SalesInputClient({ currentCustomerSales, setSalesFilter,query, setQuery, clientSelected, setClientSelected, onClientSelect, tableNumber, setTableNumber, dialogOpen, setDialogOpen, customerList,setCurrentCustomerID,currentCustomerID}: SalesInputProps) {

    const isAlreadyFreeSale = tableNumber === 0 && !clientSelected && query === "";
    const hasCustomers = Array.isArray(customerList) && customerList.length > 0;

    // Customer picker copied from the Roster (Salarios) module: a combobox
    // whose results come filtered from the server, so it scales past a
    // client-side list. Seeded with the SSR list to avoid an empty first paint.
    const [pickerOpen, setPickerOpen] = useState(false);
    const [customerQuery, setCustomerQuery] = useState("");
    const [customers, setCustomers] = useState<PickerCustomer[]>(() =>
        (customerList ?? []).map((c) => ({ id: c.id, customerName: c.customerName, alias: c.alias }))
    );

    // Debounced server-side search so the picker scales to thousands of clients.
    useEffect(() => {
        const timer = setTimeout(() => {
            searchCustomers(customerQuery).then(setCustomers);
        }, 300);
        return () => clearTimeout(timer);
    }, [customerQuery]);

    // How the account is being settled; asked in the close dialog since the
    // method is only known when the money actually changes hands.
    const [closeMethod, setCloseMethod] = useState<"CASH" | "TRANSFER">("CASH");

    // Receipt shown in the close dialog: the open account's lines aggregated
    // by product (each tap is its own UNPAID sale) plus the grand total.
    const receiptLines = useMemo(() => {
        const byProduct = new Map<string, { name: string; quantity: number; subtotal: number }>();
        for (const sale of currentCustomerSales) {
            for (const item of sale.sale_items) {
                const name = item.products?.name ?? "Producto";
                const acc = byProduct.get(name) ?? { name, quantity: 0, subtotal: 0 };
                acc.quantity += item.quantity;
                acc.subtotal += Number(item.subtotal);
                byProduct.set(name, acc);
            }
        }
        return Array.from(byProduct.values());
    }, [currentCustomerSales]);

    const receiptTotal = useMemo(
        () => currentCustomerSales.reduce((acc, s) => acc + Number(s.total), 0),
        [currentCustomerSales]
    );

    const accountLabel = query === "" ? `Mesa #${tableNumber}` : query;

    const handleCloseAccount = async () => {
        const sourceType = tableNumber !== 0 ? `MESA_${tableNumber}` : `CL- ${query}`;

        const result = await closeAccountAction(sourceType, closeMethod);

        if (result.success) {
            // The account is settled: return to venta libre so the table
            // can be occupied again with a clean slate.
            setClientSelected(false);
            setQuery("");
            setTableNumber(0);
            setDialogOpen(false);
            setCloseMethod("CASH");
            setSalesFilter("VENTA_LIBRE");
        }
    };

    const handleToDebt = async (idCustomer: number, sales: Sale[]) => {
        const res = await toDebt(idCustomer, sales);
        if (res.msg === "SUCCESS") {
            // Same as closing: the account was resolved (as debt), so the
            // POS returns to venta libre.
            setClientSelected(false);
            setQuery("");
            setTableNumber(0);
            setSalesFilter("VENTA_LIBRE");
        }
    }

    return (

        <div className="flex flex-col items-stretch justify-between gap-3 my-4 lg:my-5 lg:h-20 lg:items-start lg:gap-0">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={pickerOpen}
                        disabled={!hasCustomers}
                        className="w-full justify-between font-normal lg:w-75"
                    >
                        <span className="truncate">
                            {clientSelected && query
                                ? query
                                : hasCustomers
                                    ? "Nombre de cliente"
                                    : "No hay clientes registrados"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    {/* shouldFilter off: results already come filtered from the server */}
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Buscar por nombre o alias..."
                            value={customerQuery}
                            onValueChange={setCustomerQuery}
                        />
                        <CommandList>
                            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                            <CommandGroup>
                                {customers.map((item) => (
                                    <CommandItem
                                        key={item.id}
                                        value={item.id.toString()}
                                        onSelect={() => {
                                            const name = item.customerName || "NONAME";
                                            onClientSelect(name);
                                            setClientSelected(true);
                                            setTableNumber(0);
                                            setCurrentCustomerID(item.id);
                                            setSalesFilter("CL- " + name);
                                            setPickerOpen(false);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        {item.alias ? `${item.alias} | ` : ""}{item.customerName}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {/* Wrapping action row: full-width touch buttons on mobile,
                inline group on desktop. Long labels shrink on mobile. */}
            <div className="flex w-full flex-wrap gap-2 lg:w-fit">
                <Button className="cursor-pointer flex-1 lg:flex-none" disabled={isAlreadyFreeSale} onClick={() => {
                    setClientSelected(false);
                    setQuery("");
                    setTableNumber(0);
                    setSalesFilter("VENTA_LIBRE");

                }} ><span className="lg:hidden">Venta libre</span><span className="hidden lg:inline">Cambiar a venta libre</span></Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>

                        <Button variant="destructive" className="cursor-pointer flex-1 lg:flex-none" disabled={!clientSelected}>Cerrar cuenta <span className="hidden lg:inline">{query}</span></Button>

                    </DialogTrigger>
                    <DialogContent className="max-h-[90dvh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Pago de cuenta {accountLabel}</DialogTitle>
                            <DialogDescription>
                                Asegurate de haber procesado el pago antes de continuar.
                            </DialogDescription>
                        </DialogHeader>
                        {/* Payment method: wraps to its own line below sm so it
                            never overflows on narrow phones. */}
                        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <span className="text-sm font-medium text-gray-700">Método de pago:</span>
                            <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setCloseMethod("CASH")}
                                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                                        closeMethod === "CASH"
                                            ? "bg-emerald-600 text-white"
                                            : "text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <Banknote className="h-4 w-4" />
                                    Efectivo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCloseMethod("TRANSFER")}
                                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                                        closeMethod === "TRANSFER"
                                            ? "bg-amber-500 text-white"
                                            : "text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <CreditCard className="h-4 w-4" />
                                    Transferencia
                                </button>
                            </div>
                        </div>

                        {/* Receipt: the account's products and total, so the
                            operator confirms exactly what is being charged. */}
                        <div className="rounded-md border">
                            <div className="border-b bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                                Recibo — {accountLabel}
                            </div>
                            {receiptLines.length === 0 ? (
                                <p className="px-3 py-4 text-sm text-gray-500">
                                    Esta cuenta no tiene productos.
                                </p>
                            ) : (
                                <ul className="max-h-[35dvh] divide-y overflow-y-auto">
                                    {receiptLines.map((line) => (
                                        <li
                                            key={line.name}
                                            className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                                        >
                                            <span className="min-w-0 flex-1 truncate">
                                                <span className="font-medium text-gray-500">{line.quantity}×</span>{" "}
                                                {line.name}
                                            </span>
                                            <span className="shrink-0 tabular-nums">
                                                ${line.subtotal.toFixed(2)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="flex items-center justify-between border-t px-3 py-2 text-base font-bold">
                                <span>Total</span>
                                <span className="tabular-nums">${receiptTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button
                                    className="cursor-pointer"
                                    variant="outline"
                                >
                                    Cancelar
                                </Button>
                            </DialogClose>

                            <DialogClose asChild>
                                <Button
                                    className="cursor-pointer"
                                    onClick={() => {
                                        handleCloseAccount()
                                    }}
                                >
                                    Confirmar y Cerrar
                                </Button>
                            </DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button className="cursor-pointer flex-1 lg:flex-none bg-amber-500 text-black hover:bg-amber-400" disabled={!clientSelected}>A deuda <span className="hidden lg:inline">{query}</span></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Desea enviar la cuenta de &quot;{query}&quot; a deuda?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Total a registrar como deuda: ${receiptTotal.toFixed(2)}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel asChild>
                                <Button className="cursor-pointer" variant={"outline"}>Cancelar</Button>
                            </AlertDialogCancel>
                            <AlertDialogAction asChild>
                                <Button onClick={() => handleToDebt(currentCustomerID, currentCustomerSales)}  className="cursor-pointer">Aceptar</Button>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

        </div>
    );
}
