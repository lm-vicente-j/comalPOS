"use client"

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

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
import { Debtor } from "@/lib/actions/debts";
import { closeAccountAction } from "@/lib/actions/sales";

interface SalesInputProps {
    query: string;
    setQuery: (val: string) => void;
    clientSelected: boolean;
    setClientSelected: (val: boolean) => void;
    onClientSelect: (name: string) => void;
    tableNumber: number;
    setTableNumber: (val: number) => void;
    setDialogOpen: (val: boolean) => void;
    dialogOpen: boolean;
    debtorsList: Debtor[]
}



export default function SalesInputClient({ query, setQuery, clientSelected, setClientSelected, onClientSelect, tableNumber, setTableNumber, dialogOpen, setDialogOpen, debtorsList }: SalesInputProps) {

    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const [open, setOpen] = useState(false);


    const isAlreadyFreeSale = tableNumber === 0 && !clientSelected && query === "";
    const hasDebtors = Array.isArray(debtorsList) && debtorsList.length > 0;
    const isInputDisabled = !hasDebtors;

    const handleCloseAccount = async () => {
        const sourceType = tableNumber !== 0 ? `MESA-${tableNumber}` : `CL- ${query}`;

        const result = await closeAccountAction(sourceType);

        if (result.success) {
            setClientSelected(false);
            setQuery("");
            setTableNumber(0);
            setDialogOpen(false);
        }
    };

    return (

        <div className=" h-20 flex flex-col items-start justify-between my-5">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverAnchor asChild>
                    <Input ref={inputRef} type="text"
                        placeholder={isInputDisabled ? "No hay deudores registrados" : "Nombre de cliente"}
                        disabled={isInputDisabled} value={query} onChange={(e) => {
                            setQuery(e.target.value);
                            setOpen(true);
                        }} className="max-w" />
                </PopoverAnchor>
                <PopoverContent className="p-0 w-(--radix-popover-trigger-width)" onOpenAutoFocus={(e) => e.preventDefault()} >
                    <Command>
                        <CommandList>
                            <CommandEmpty>No se encontraron deudores.</CommandEmpty>
                            <CommandGroup>

                                {Array.isArray(debtorsList) && debtorsList.length > 0 ? (
                                    debtorsList.map((item) => (
                                        <CommandItem
                                            key={item.id}
                                            value={item.customer?.customerName || ""}
                                            onSelect={() => {
                                                onClientSelect(item.customer?.customerName || "NONAME");
                                                setClientSelected(true);
                                                setTableNumber(0);
                                                setOpen(false);
                                            }}
                                            className="cursor-pointer"
                                        >
                                            {item.customer?.alias} | {item.customer?.customerName}
                                        </CommandItem>
                                    ))
                                ) : null}                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <ButtonGroup>
                <Button className="cursor-pointer" disabled={isAlreadyFreeSale} onClick={() => {
                    setClientSelected(false);
                    setQuery("");
                    setTableNumber(0);

                }} >Cambiar a venta libre</Button>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>

                        <Button variant="destructive" className="cursor-pointer" disabled={!clientSelected}>Cerrar cuenta {query}</Button>

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
                        <Button className="cursor-pointer bg-amber-500 text-black hover:bg-amber-400" disabled={!clientSelected}>A deuda {query}</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your
                                account and remove your data from our servers.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel asChild>
                                <Button className="cursor-pointer" variant={"outline"}>Cancelar</Button>
                            </AlertDialogCancel>
                            <AlertDialogAction asChild>
                                <Button className="cursor-pointer">Aceptar</Button>
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </ButtonGroup>

        </div>
    );
}