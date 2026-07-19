"use client"

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { toDebt } from "@/lib/actions/debts";

import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandEmpty
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverAnchor,
} from "@/components/ui/popover"

import {
    Dialog,
    DialogContent,
    DialogDescription,
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



export default function SalesInputClient({ currentCustomerSales, setSalesFilter,query, setQuery, clientSelected, setClientSelected, onClientSelect, tableNumber, setTableNumber, dialogOpen, setDialogOpen, customerList,setCurrentCustomerID,currentCustomerID}: SalesInputProps) {

    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        // Autofocus only on desktop: on mobile it would pop the on-screen
        // keyboard as soon as the POS opens.
        if (window.matchMedia("(min-width: 1024px)").matches) {
            inputRef.current?.focus();
        }
    }, []);
    const [open, setOpen] = useState(false);

    const isAlreadyFreeSale = tableNumber === 0 && !clientSelected && query === "";
    const hasCustomers = Array.isArray(customerList) && customerList.length > 0;
    const isInputDisabled = !hasCustomers;

    const handleCloseAccount = async () => {
        const sourceType = tableNumber !== 0 ? `MESA_${tableNumber}` : `CL- ${query}`;

        const result = await closeAccountAction(sourceType);

        if (result.success) {
            setClientSelected(false);
            setQuery("");
            setTableNumber(0);
            setDialogOpen(false);
        }
    };

    const handleToDebt = async (idCustomer: number, sales: Sale[]) => {
        await toDebt(idCustomer, sales);
    }

    return (

        <div className="flex flex-col items-stretch justify-between gap-3 my-4 lg:my-5 lg:h-20 lg:items-start lg:gap-0">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverAnchor asChild>
                    <Input ref={inputRef} type="text"
                        placeholder={isInputDisabled ? "No hay clientes registrados" : "Nombre de cliente"}
                        disabled={isInputDisabled} value={query} onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }} className="max-w" />
                </PopoverAnchor>
                <PopoverContent className="p-0 w-(--radix-popover-trigger-width)" onOpenAutoFocus={(e) => e.preventDefault()} >
                    <Command>
                        <CommandList>
                            <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                            <CommandGroup>

                                {Array.isArray(customerList) && customerList.length > 0 ? (
                                    customerList.map((item) => (
                                        <CommandItem
                                            key={item.id}
                                            value={item?.customerName || ""}
                                            onSelect={() => {
                                                onClientSelect(item?.customerName || "NONAME");
                                                setClientSelected(true);
                                                setTableNumber(0);
                                                setOpen(false);
                                                setCurrentCustomerID(item.id);
                                                setSalesFilter("CL- " + item?.customerName)
                                            }}
                                            className="cursor-pointer"
                                        >
                                            {item?.alias} | {item?.customerName}
                                        </CommandItem>
                                    ))
                                ) : null}
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
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Pago de cuenta {query === "" ? "Mesa #" + tableNumber : query}</DialogTitle>
                            <DialogDescription>
                                Asegurate de haber procesado el pago antes de continuar.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end gap-3 mt-4">
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

                        </div>
                    </DialogContent>
                </Dialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button className="cursor-pointer flex-1 lg:flex-none bg-amber-500 text-black hover:bg-amber-400" disabled={!clientSelected}>A deuda <span className="hidden lg:inline">{query}</span></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Desea enviar la cuenta de "{query}" a deuda?</AlertDialogTitle>
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