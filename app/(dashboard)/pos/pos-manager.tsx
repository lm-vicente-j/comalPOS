"use client";

import { useState } from "react";
import Seatings from "@/components/Seatings";
import SalesInputClient from "@/components/Sales-input-client";
import DataTable from "./date-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Product } from "@/lib/actions/schemas";
import { Sale } from "@/lib/actions/sales";
import { SalesRow } from "./saleRow";
import { Customer } from "@/lib/actions/schemas";

interface PosManagerProps {
    products: Product[];
    sales: Sale[];
    customerList: Customer[];
    jornadaOpen: boolean;
}

function FilterSales(sales:Sale[], src:string):Sale[]{
    return sales.filter(s => s.source_type == src);
}


export default function PosManager({ products, sales, customerList, jornadaOpen }: PosManagerProps) {

    const [salesHistory, setSalesHistory] = useState<{ productID: number; quantity: number; name: string; price: number }[]>([]);
    const [tableNumber, setTableNumber] = useState(0);
    const [query, setQuery] = useState("");
    const [clientSelected, setClientSelected] = useState(false);

    const [currentCustomerID, setCurrentCustomerID] = useState(0);

    // Filter sales
    const [salesFilter, setSalesFilter] = useState("VENTA_LIBRE");
    sales = FilterSales(sales, salesFilter);

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
        // Mobile (< lg): single scrollable column ordered for the 3-tap sale
        // flow (context selector -> product grid -> recent orders).
        // Desktop (lg+): 40/60 two-column layout, products spanning the left.
        <div className="z-0 flex w-full flex-col gap-3 p-3 lg:grid lg:h-full lg:grid-cols-[2fr_3fr] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-0 lg:p-0">
            {/* Sale controls go inert without an open jornada; the history below stays usable. */}
            <div
                aria-disabled={!jornadaOpen}
                className={`order-2 lg:order-none lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:flex lg:h-full lg:items-center lg:justify-center ${!jornadaOpen ? "pointer-events-none opacity-50 select-none" : ""}`}
            >
                <DataTable data={products} onSelect={addToHistory} tableNumber={tableNumber} clientName={query} clientSelected={clientSelected} customerID={currentCustomerID} />
            </div>

            <div
                aria-disabled={!jornadaOpen}
                className={`order-1 lg:order-none lg:col-start-2 lg:row-start-1 lg:px-5 lg:pt-5 ${!jornadaOpen ? "pointer-events-none opacity-50 select-none" : ""}`}
            >
                <div className="flex flex-col rounded-md">
                    <p className="font-bold mb-2">Mesas</p>
                    <Seatings
                        setSalesFilter={setSalesFilter}
                        tableNumber={tableNumber}
                        setTableNumber={handleTableSelect}
                        setDialogOpen={setDialogOpen}
                    />
                </div>

                <SalesInputClient
                    currentCustomerSales={FilterSales(sales,salesFilter)}
                    setSalesFilter={setSalesFilter}
                    query={query}
                    setQuery={setQuery}
                    clientSelected={clientSelected}
                    setClientSelected={setClientSelected}
                    onClientSelect={handleClientSelect}
                    tableNumber={tableNumber}
                    setTableNumber={setTableNumber}
                    setDialogOpen={setDialogOpen}
                    dialogOpen={dialogOpen}
                    customerList={customerList}
                    setCurrentCustomerID={setCurrentCustomerID}
                    currentCustomerID={currentCustomerID}
                />
            </div>

            <ScrollArea className="order-3 h-[50vh] w-full rounded-md border p-2 lg:order-none lg:col-start-2 lg:row-start-2 lg:mx-5 lg:mb-5 lg:h-auto lg:w-auto lg:p-4">
                <Table>
                    <TableCaption>Lista de pedidos recientes.</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="hidden sm:table-cell">Cliente/Mesa</TableHead>
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
    );
}