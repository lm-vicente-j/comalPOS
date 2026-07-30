"use client";

import { useMemo, useOptimistic, useRef, useState, startTransition } from "react";
import Seatings from "@/components/Seatings";
import FreeSaleTickets, { FreeSaleTicket } from "@/components/FreeSaleTickets";
import SalesInputClient from "@/components/Sales-input-client";
import DataTable from "./date-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Product } from "@/lib/actions/schemas";
import { Sale, createSale, nextFreeSaleTicket } from "@/lib/actions/sales";
import { SalesRow } from "./saleRow";
import { Customer } from "@/lib/actions/schemas";
import { makeOptimisticSale } from "./optimistic-sale";
import {
    FREE_SALE_SOURCE,
    customerSource,
    formatSourceType,
    freeTicketNumber,
    freeTicketSource,
    isAccountSource,
    tableSource,
} from "@/lib/pos-source";

interface PosManagerProps {
    products: Product[];
    sales: Sale[];
    customerList: Customer[];
    jornadaOpen: boolean;
}

function FilterSales(sales:Sale[], src:string):Sale[]{
    // Account views (table, customer, walk-in ticket) show only the open
    // (UNPAID) account: once it is settled the table can be occupied again
    // with a clean slate, so its settled history stays out of the POS view.
    const isAccountView = isAccountSource(src);
    return sales.filter(s => s.source_type == src && (!isAccountView || s.status === "UNPAID"));
}


export default function PosManager({ products, sales, customerList, jornadaOpen }: PosManagerProps) {

    const [tableNumber, setTableNumber] = useState(0);
    const [query, setQuery] = useState("");
    const [clientSelected, setClientSelected] = useState(false);
    // Walk-in ticket being served, 0 when none. Mutually exclusive with the
    // table and customer selections: a sale belongs to exactly one account.
    const [freeTicket, setFreeTicket] = useState(0);
    const [creatingTicket, setCreatingTicket] = useState(false);

    const [currentCustomerID, setCurrentCustomerID] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Optimistic overlay: a tapped product shows up in the order list, the
    // ticket totals and the close-account receipt in the same instant,
    // before createSale answers. When the revalidated sales arrive, the
    // placeholder is swapped for the real row. If the action fails, the
    // overlay simply reverts to the props.
    const [optimisticSales, addOptimisticSale] = useOptimistic(
        sales,
        (current: Sale[], sale: Sale) => [sale, ...current]
    );

    // Per-tap feedback: the pressed product darkens while its sale is being
    // registered (and further taps on it are ignored meanwhile).
    const [pendingId, setPendingId] = useState<number | null>(null);
    const optimisticIdRef = useRef(0);

    // Open walk-in tickets, derived from the sales the server component
    // already loaded — no extra query, and the layout's AutoRefresh keeps
    // them in sync with the other terminals.
    const openTickets = useMemo(() => {
        const byNumber = new Map<number, FreeSaleTicket>();

        for (const sale of optimisticSales) {
            if (sale.status !== "UNPAID") continue;
            const number = freeTicketNumber(sale.source_type);
            if (number === null) continue;

            const ticket = byNumber.get(number)
                ?? { sourceType: sale.source_type, number, total: 0 };
            ticket.total += Number(sale.total);
            byNumber.set(number, ticket);
        }

        return byNumber;
    }, [optimisticSales]);

    // A ticket that was just opened has no sales yet, so it only exists in
    // this component's state until the first product is tapped.
    const tickets = useMemo(() => {
        const list = Array.from(openTickets.values());
        if (freeTicket > 0 && !openTickets.has(freeTicket)) {
            list.push({ sourceType: freeTicketSource(freeTicket), number: freeTicket, total: 0 });
        }
        return list.sort((a, b) => a.number - b.number);
    }, [openTickets, freeTicket]);

    // The account every new sale goes to; null means no account is selected
    // and the order list below is just showing today's settled free sales.
    const activeSource =
        tableNumber > 0 ? tableSource(tableNumber)
        : clientSelected && query !== "" ? customerSource(query)
        : freeTicket > 0 ? freeTicketSource(freeTicket)
        : null;

    // Derived instead of a second piece of state: keeping a `salesFilter`
    // in sync by hand meant every selector had to remember to update both.
    const visibleSales = FilterSales(optimisticSales, activeSource ?? FREE_SALE_SOURCE);

    const resetToFreeSaleView = () => {
        setTableNumber(0);
        setQuery("");
        setClientSelected(false);
        // Cleared with the rest: a stale customer id would otherwise get
        // attached to the next walk-in sale (and touch that customer's
        // lastConsumption) long after leaving their account.
        setCurrentCustomerID(0);
        setFreeTicket(0);
    };

    const handleTableSelect = (num: number) => {
        resetToFreeSaleView();
        setTableNumber(num);
    };

    const handleClientSelect = (customer: { id: number; name: string }) => {
        resetToFreeSaleView();
        setQuery(customer.name);
        setClientSelected(true);
        setCurrentCustomerID(customer.id);
    };

    const handleTicketSelect = (ticketNumber: number) => {
        resetToFreeSaleView();
        setFreeTicket(ticketNumber);
    };

    // Opening a ticket doesn't close the others: it only changes which one
    // receives the next products. The number comes from the server so two
    // terminals can't hand the same one to two different customers.
    const openNewTicket = async (): Promise<string | null> => {
        setCreatingTicket(true);
        try {
            const result = await nextFreeSaleTicket();

            if (!result.success) {
                alert(result.message === "NO_OPEN_JORNADA"
                    ? "No hay jornada activa. Pide al administrador que abra la jornada antes de registrar ventas."
                    : "No se pudo abrir el ticket. Intenta de nuevo.");
                return null;
            }

            const number = freeTicketNumber(result.sourceType);
            if (number === null) return null;

            handleTicketSelect(number);
            return result.sourceType;
        } finally {
            setCreatingTicket(false);
        }
    };

    // Tapping a product with nothing selected opens a walk-in ticket on the
    // spot, so the quick "tap and done" flow survives: the only change is
    // that the sale now waits in an account until it is charged.
    const ensureSourceType = async (): Promise<string | null> =>
        activeSource ?? (await openNewTicket());

    // Optimistic add: the line, the totals and the receipt update instantly;
    // the server action runs inside the transition and its revalidated
    // payload replaces the placeholder when it lands.
    const handleProductTap = (product: Product) => {
        if (pendingId !== null) return;
        const productId = product.id ?? -1;

        setPendingId(productId);
        void ensureSourceType().then((sourceType) => {
            if (!sourceType) {
                setPendingId(null);
                return;
            }

            startTransition(async () => {
                addOptimisticSale(makeOptimisticSale(--optimisticIdRef.current, product, sourceType));
                try {
                    const result = await createSale(
                        [{ productID: productId, quantity: 1 }],
                        "UNPAID",
                        sourceType,
                        Number(currentCustomerID)
                    );
                    if (!result.success) {
                        alert(result.message === "NO_OPEN_JORNADA"
                            ? "No hay jornada activa. Pide al administrador que abra la jornada antes de registrar ventas."
                            : "No se pudo registrar la venta. Revisa la consola del servidor para más detalle.");
                    }
                } finally {
                    setPendingId(null);
                }
            });
        });
    };

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
                <DataTable data={products} onProductTap={handleProductTap} pendingId={pendingId} />
            </div>

            <div
                aria-disabled={!jornadaOpen}
                className={`order-1 lg:order-none lg:col-start-2 lg:row-start-1 lg:px-5 lg:pt-5 ${!jornadaOpen ? "pointer-events-none opacity-50 select-none" : ""}`}
            >
                <div className="flex flex-col rounded-md">
                    <p className="font-bold mb-2">Mesas</p>
                    <Seatings
                        tableNumber={tableNumber}
                        setTableNumber={handleTableSelect}
                        setDialogOpen={setDialogOpen}
                    />
                </div>

                <div className="flex flex-col rounded-md mt-4">
                    <p className="font-bold mb-2">Clientes de paso</p>
                    <FreeSaleTickets
                        tickets={tickets}
                        activeTicket={freeTicket}
                        onSelect={handleTicketSelect}
                        onNew={openNewTicket}
                        creating={creatingTicket}
                    />
                </div>

                <SalesInputClient
                    currentCustomerSales={visibleSales}
                    sourceType={activeSource}
                    accountLabel={activeSource ? formatSourceType(activeSource) : "Venta libre"}
                    query={query}
                    clientSelected={clientSelected}
                    onClientSelect={handleClientSelect}
                    onFreeSaleView={resetToFreeSaleView}
                    onAccountSettled={resetToFreeSaleView}
                    setDialogOpen={setDialogOpen}
                    dialogOpen={dialogOpen}
                    customerList={customerList}
                    currentCustomerID={currentCustomerID}
                />
            </div>

            <ScrollArea className="order-3 h-[50vh] w-full rounded-md border p-2 lg:order-none lg:col-start-2 lg:row-start-2 lg:mx-5 lg:mb-5 lg:h-auto lg:w-auto lg:p-4">
                <Table>
                    <TableCaption>Lista de pedidos recientes.</TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="hidden sm:table-cell">Cliente/Mesa</TableHead>
                            {/* Short labels + tight padding below sm so the
                                operations column never gets cut off. */}
                            <TableHead className="px-1 sm:px-2">
                                <span className="sm:hidden">Cant.</span>
                                <span className="hidden sm:inline">Cantidad</span>
                            </TableHead>
                            <TableHead className="px-1 sm:px-2">Platillo</TableHead>
                            <TableHead className="px-1 text-right sm:px-2">Precio</TableHead>
                            <TableHead className="px-1 text-center sm:px-2">
                                <span className="sm:hidden">Ops.</span>
                                <span className="hidden sm:inline">Operacion</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <SalesRow sales={visibleSales} />

                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    );
}
