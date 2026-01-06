"use client";

import { useState } from "react";
import Seatings from "@/components/Seatings";
import SalesInputClient from "@/components/Sales-input-client";
import DataTable, { Product } from "./date-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2Icon, PlusIcon, MinusIcon } from "lucide-react";

function ProductRow() {
    return (
        <TableRow>
            <TableCell className="font-medium">Nombre_Cliente</TableCell>

            <TableCell>5</TableCell>
            <TableCell>Hamburguesa clasica</TableCell>

            <TableCell className="text-right">$250.00</TableCell>
            <TableCell className="flex items-center justify-center gap-2">


                <Button className="cursor-pointer size-6" variant="outline" size="icon">
                    <PlusIcon />
                </Button>
                <Button className="cursor-pointer size-6" variant="outline" size="icon">
                    <MinusIcon />
                </Button>
                <Button className="cursor-pointer size-6" variant="outline" size="icon">
                    <Trash2Icon />
                </Button>
            </TableCell>
        </TableRow>

    );
}

export default function PosManager({ products }: { products: Product[] }) {
    const [tableNumber, setTableNumber] = useState(0);
    const [query, setQuery] = useState("");
    const [clientSelected, setClientSelected] = useState(false);


    const handleTableSelect = (num: number) => {
        setTableNumber(num);
        if (num !== 0) {
            setQuery("");
            setClientSelected(false);
        }
    };

    const handleClientSelect = (clientName: string) => {
        setQuery(clientName);
        setClientSelected(true);
        setTableNumber(0);
    };
    const [dialogOpen, setDialogOpen] = useState(false);

    return (
        <div className="flex flex-row items-center justify-around z-0 w-full h-full">
            <div className="flex items-center justify-center w-[50%] h-full">
                <DataTable data={products} />
            </div>

            <div className="p-5 w-[50%] h-full">
                <div className="flex flex-col rounded-md h-30">
                    <p className="font-bold mb-2">Mesas</p>
                    <Seatings
                        tableNumber={tableNumber}
                        setTableNumber={handleTableSelect}
                        setDialogOpen={setDialogOpen}
                    />
                </div>

                <SalesInputClient
                    query={query}
                    setQuery={setQuery}
                    clientSelected={clientSelected}
                    setClientSelected={setClientSelected}
                    onClientSelect={handleClientSelect}
                    tableNumber={tableNumber}
                    setTableNumber={setTableNumber}
                    setDialogOpen={setDialogOpen}
                    dialogOpen={dialogOpen}
                />

                <ScrollArea className="h-[50%] w-full rounded-md border p-4">
                    <Table>
                        <TableCaption>Lista de pedidos recientes.</TableCaption>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente/Mesa</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Platillo</TableHead>
                                <TableHead className="text-right">Precio</TableHead>
                                <TableHead className="text-center">Operacion</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {
                                Array.from({ length: 200 }).map((_, index) => {
                                    return <ProductRow />
                                })
                            }

                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </div>
    );
}