"use client";

import { useState } from "react";
import Seatings from "@/components/Seatings";
import SalesInputClient from "@/components/Sales-input-client";
import DataTable from "./date-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Product } from "@/lib/actions/products";
import { Sale } from "@/lib/actions/sales";
import { SalesRow } from "./saleRow";
import { Debtor } from "@/lib/actions/debts";

interface PosManagerProps {
    products: Product[];
    sales: Sale[];
    debtorsList: Debtor[]
}

export default function PosManager({ products, sales, debtorsList }: PosManagerProps) {
    const [salesHistory, setSalesHistory] = useState<{ productID: number; quantity: number; name: string; price: number }[]>([]);
    const [tableNumber, setTableNumber] = useState(0);
    const [query, setQuery] = useState("");
    const [clientSelected, setClientSelected] = useState(false);


    const addToHistory = (product: Product)=>{
        setSalesHistory((prev) => {
            const existing = prev.find((item) => item.productID === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.productID === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { productID: product.id!, quantity: 1, name: product.name, price: product.price }];
        });
    }

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
            <div className="flex items-center justify-center w-[40%] h-full">
                <DataTable data={products} onSelect={addToHistory} tableNumber={tableNumber} clientName={query} clientSelected={clientSelected}/>
            </div>

            <div className="p-5 w-[60%] h-full">
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
                    debtorsList={debtorsList}
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
                            <SalesRow sales={sales} />

                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </div>
    );
}