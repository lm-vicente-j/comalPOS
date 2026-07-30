"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Customer, Product } from "@/lib/actions/schemas";
import {
    Sale,
    cancelSaleAction,
    closeAccountAction,
    createSale,
    nextFreeSaleTicket,
    updateSaleQuantity,
} from "@/lib/actions/sales";
import { searchCustomers } from "@/lib/actions/customers";
import { toDebt } from "@/lib/actions/debts";
import {
    FREE_SALE_SOURCE,
    customerSource,
    formatSourceType,
    freeTicketNumber,
    freeTicketSource,
    tableSource,
} from "@/lib/pos-source";
import {
    Banknote,
    ChevronUp,
    ChevronsUpDown,
    CreditCard,
    History,
    Minus,
    Plus,
    Search,
    Trash2,
    X,
} from "lucide-react";

interface MobilePosManagerProps {
    products: Product[];
    sales: Sale[];
    customerList: Customer[];
    jornadaOpen: boolean;
}

// Only the fields the picker needs; matches searchCustomers' selection so the
// SSR list and the server search results share one shape.
type PickerCustomer = { id: number; customerName: string | null; alias: string | null };

// Where a new sale lands; the same account model as the desktop POS.
type ContextTab = "tables" | "tickets" | "customer";

/**
 * Mobile (< lg) POS, mounted next to the desktop PosManager the same way the
 * admin modules mount their Mobile*Manager: the page picks one per breakpoint
 * and this one owns the small-screen flow end to end.
 *
 * Laid out for the thumb, top to bottom:
 *   1. Context selector — one segmented tab row (Mesas / De paso / Cliente)
 *      with a single chip row underneath, so picking where the sale goes
 *      never pushes the products off screen.
 *   2. Product grid — gets every pixel left over and scrolls internally.
 *   3. Account bar — always above the bottom nav: the open account with its
 *      live total, or today's charged free sales when nothing is selected.
 *      Both open a bottom sheet (same sheet idiom as the mobile nav menu).
 *
 * The sale itself stays a 3-tap flow: context (or nothing, which opens a
 * walk-in ticket) -> tap products -> charge from the sheet.
 */
export default function MobilePosManager({ products, sales, customerList, jornadaOpen }: MobilePosManagerProps) {
    const router = useRouter();

    const [tableNumber, setTableNumber] = useState(0);
    const [freeTicket, setFreeTicket] = useState(0);
    const [creatingTicket, setCreatingTicket] = useState(false);
    const [currentCustomerID, setCurrentCustomerID] = useState(0);
    const [clientSelected, setClientSelected] = useState(false);
    const [query, setQuery] = useState("");
    const [contextTab, setContextTab] = useState<ContextTab>("tickets");

    const [productQuery, setProductQuery] = useState("");
    const [pendingId, setPendingId] = useState<number | null>(null);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [closeMethod, setCloseMethod] = useState<"CASH" | "TRANSFER">("CASH");
    const [settling, setSettling] = useState(false);
    const [debtConfirm, setDebtConfirm] = useState(false);

    // Customer picker, copied from the desktop SalesInputClient: server-side
    // search, seeded with the SSR list to avoid an empty first paint.
    const [pickerOpen, setPickerOpen] = useState(false);
    const [customerQuery, setCustomerQuery] = useState("");
    const [customers, setCustomers] = useState<PickerCustomer[]>(() =>
        (customerList ?? []).map((c) => ({ id: c.id, customerName: c.customerName, alias: c.alias }))
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            searchCustomers(customerQuery).then(setCustomers);
        }, 300);
        return () => clearTimeout(timer);
    }, [customerQuery]);

    const hasCustomers = Array.isArray(customerList) && customerList.length > 0;

    // Open walk-in tickets, derived from the sales the server component
    // already loaded — the layout's AutoRefresh keeps them in sync with the
    // other terminals.
    const openTickets = useMemo(() => {
        const byNumber = new Map<number, { sourceType: string; number: number; total: number }>();

        for (const sale of sales) {
            if (sale.status !== "UNPAID") continue;
            const number = freeTicketNumber(sale.source_type);
            if (number === null) continue;

            const ticket = byNumber.get(number)
                ?? { sourceType: sale.source_type, number, total: 0 };
            ticket.total += Number(sale.total);
            byNumber.set(number, ticket);
        }

        return byNumber;
    }, [sales]);

    // A ticket that was just opened has no sales yet, so it only exists in
    // this component's state until the first product is tapped.
    const tickets = useMemo(() => {
        const list = Array.from(openTickets.values());
        if (freeTicket > 0 && !openTickets.has(freeTicket)) {
            list.push({ sourceType: freeTicketSource(freeTicket), number: freeTicket, total: 0 });
        }
        return list.sort((a, b) => a.number - b.number);
    }, [openTickets, freeTicket]);

    // The account every new sale goes to; null means no account selected and
    // the bottom bar falls back to today's charged free sales.
    const activeSource =
        tableNumber > 0 ? tableSource(tableNumber)
        : clientSelected && query !== "" ? customerSource(query)
        : freeTicket > 0 ? freeTicketSource(freeTicket)
        : null;

    const accountSales = useMemo(
        () => sales.filter((s) => s.source_type === activeSource && s.status === "UNPAID"),
        [sales, activeSource]
    );

    // One row per sale_item, like the desktop order list: each tap is its own
    // UNPAID sale and the stepper/trash act on that sale directly.
    const accountLines = useMemo(
        () =>
            accountSales.flatMap((sale) =>
                sale.sale_items.map((item, k) => ({
                    key: `${sale.id}-${k}`,
                    saleId: sale.id,
                    productID: item.productID,
                    name: item.products?.name ?? "Producto",
                    quantity: item.quantity,
                    subtotal: Number(item.subtotal || 0),
                }))
            ),
        [accountSales]
    );

    const accountTotal = useMemo(
        () => accountSales.reduce((acc, s) => acc + Number(s.total), 0),
        [accountSales]
    );
    const accountCount = useMemo(
        () => accountLines.reduce((acc, line) => acc + line.quantity, 0),
        [accountLines]
    );

    // Short label for the bottom bar: "Ticket #2" reads better than
    // "Venta libre #2" where space is tight; tables and customers keep
    // formatSourceType's wording.
    const accountLabel = activeSource
        ? freeTicketNumber(activeSource) !== null
            ? `Ticket #${freeTicketNumber(activeSource)}`
            : formatSourceType(activeSource)
        : null;

    // Today's charged walk-in sales, shown in the history sheet when no
    // account is selected — the mobile counterpart of the desktop order list.
    const settledFreeSales = useMemo(
        () => sales.filter((s) => s.source_type === FREE_SALE_SOURCE),
        [sales]
    );
    const settledTotal = useMemo(
        () => settledFreeSales.reduce((acc, s) => acc + Number(s.total), 0),
        [settledFreeSales]
    );

    const filteredProducts = useMemo(() => {
        const q = productQuery.trim().toLowerCase();
        if (q === "") return products;
        return products.filter((p) => p.name.toLowerCase().includes(q));
    }, [products, productQuery]);

    const resetToFreeSaleView = () => {
        setTableNumber(0);
        setQuery("");
        setClientSelected(false);
        // Cleared with the rest: a stale customer id would otherwise get
        // attached to the next walk-in sale (and touch that customer's
        // lastConsumption) long after leaving their account.
        setCurrentCustomerID(0);
        setFreeTicket(0);
        setContextTab("tickets");
        setSheetOpen(false);
        setDebtConfirm(false);
    };

    // Tapping the selected chip again leaves the account without settling
    // it — the mobile counterpart of "Cambiar a venta libre".
    const handleTableSelect = (num: number) => {
        if (num === tableNumber) {
            resetToFreeSaleView();
            return;
        }
        resetToFreeSaleView();
        setTableNumber(num);
        setContextTab("tables");
    };

    const handleTicketSelect = (num: number) => {
        if (num === freeTicket) {
            resetToFreeSaleView();
            return;
        }
        resetToFreeSaleView();
        setFreeTicket(num);
        setContextTab("tickets");
    };

    const handleClientSelect = (customer: { id: number; name: string }) => {
        resetToFreeSaleView();
        setQuery(customer.name);
        setClientSelected(true);
        setCurrentCustomerID(customer.id);
        setContextTab("customer");
    };

    // The number comes from the server so two terminals can't hand the same
    // one to two different customers.
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

            resetToFreeSaleView();
            setFreeTicket(number);
            setContextTab("tickets");
            return result.sourceType;
        } finally {
            setCreatingTicket(false);
        }
    };

    // Tapping a product with nothing selected opens a walk-in ticket on the
    // spot, keeping the quick "tap and done" flow.
    const ensureSourceType = async (): Promise<string | null> =>
        activeSource ?? (await openNewTicket());

    const handleProductTap = async (product: Product) => {
        if (pendingId !== null) return;
        const productId = product.id ?? -1;

        setPendingId(productId);
        try {
            const sourceType = await ensureSourceType();
            if (!sourceType) return;

            const result = await createSale(
                [{ productID: productId, quantity: 1 }],
                "UNPAID",
                sourceType,
                Number(currentCustomerID)
            );

            if (!result.success) {
                alert("No se pudo registrar la venta. Revisa la consola del servidor para más detalle.");
                return;
            }

            router.refresh();
        } finally {
            setPendingId(null);
        }
    };

    const handleCloseAccount = async () => {
        if (!activeSource || settling) return;
        setSettling(true);
        try {
            const result = await closeAccountAction(activeSource, closeMethod);
            if (result.success) {
                // Settled: back to venta libre so the table or ticket number
                // is free for the next customer.
                resetToFreeSaleView();
                setCloseMethod("CASH");
                router.refresh();
            } else {
                alert("No se pudo cerrar la cuenta. Intenta de nuevo.");
            }
        } finally {
            setSettling(false);
        }
    };

    const handleToDebt = async () => {
        const res = await toDebt(currentCustomerID, accountSales);
        if (res.msg === "SUCCESS") {
            // Resolved as debt: same clean slate as after charging.
            resetToFreeSaleView();
            router.refresh();
        }
    };

    const handleUpdateQuantity = async (saleId: number, quantity: number, productId: number) => {
        await updateSaleQuantity(saleId, quantity, productId);
        router.refresh();
    };

    const handleDeleteLine = async (saleId: number) => {
        await cancelSaleAction(saleId);
        router.refresh();
    };

    const gated = !jornadaOpen ? "pointer-events-none opacity-50 select-none" : "";

    const TABS: { id: ContextTab; label: string }[] = [
        { id: "tables", label: "Mesas" },
        { id: "tickets", label: "De paso" },
        { id: "customer", label: "Cliente" },
    ];

    return (
        <div className="flex h-full w-full flex-col bg-gray-50">
            {/* 1. Context selector + product search. Inert without an open
                jornada, same as the desktop sale controls. */}
            <div aria-disabled={!jornadaOpen} className={cn("shrink-0", gated)}>
                <div className="px-3 pt-3">
                    <div className="grid grid-cols-3 gap-1 rounded-full bg-gray-200/70 p-1">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setContextTab(tab.id)}
                                className={cn(
                                    "h-9 rounded-full text-sm font-medium text-gray-600 transition-colors cursor-pointer",
                                    contextTab === tab.id && "bg-white text-gray-900 shadow-sm"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* One chip row per tab; the row height stays fixed so the
                    products below never jump when switching tabs. */}
                <div className="flex h-14 items-center px-3">
                    {contextTab === "tables" && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {Array.from({ length: 10 }).map((_, index) => {
                                const num = index + 1;
                                const isSelected = tableNumber === num;
                                return (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => handleTableSelect(num)}
                                        className={cn(
                                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white font-medium text-gray-800 shadow-sm transition-colors cursor-pointer active:bg-gray-200",
                                            isSelected && "border-amber-300 bg-amber-300 text-black"
                                        )}
                                    >
                                        {num}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {contextTab === "tickets" && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {tickets.map((ticket) => {
                                const isSelected = ticket.number === freeTicket;
                                return (
                                    <button
                                        key={ticket.sourceType}
                                        type="button"
                                        onClick={() => handleTicketSelect(ticket.number)}
                                        className={cn(
                                            "flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border bg-white px-3 text-gray-800 shadow-sm transition-colors cursor-pointer active:bg-gray-200",
                                            isSelected && "border-amber-300 bg-amber-300 text-black"
                                        )}
                                    >
                                        <span>#{ticket.number}</span>
                                        <span className="tabular-nums opacity-70">${ticket.total.toFixed(2)}</span>
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={openNewTicket}
                                disabled={creatingTicket}
                                className="flex h-11 shrink-0 items-center justify-center gap-1 rounded-xl border border-dashed bg-white px-3 font-medium text-gray-600 shadow-sm transition-colors cursor-pointer active:bg-gray-200"
                            >
                                <Plus className="h-4 w-4" />
                                Nuevo
                            </button>
                            {tickets.length === 0 && (
                                <p className="shrink-0 pl-1 text-xs text-muted-foreground">
                                    Toca un producto o &quot;Nuevo&quot; para abrir un ticket.
                                </p>
                            )}
                        </div>
                    )}

                    {contextTab === "customer" && (
                        <div className="flex w-full items-center gap-2">
                            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={pickerOpen}
                                        disabled={!hasCustomers}
                                        className="h-11 w-full justify-between rounded-xl bg-white font-normal shadow-sm"
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
                                                            handleClientSelect({ id: item.id, name: item.customerName || "NONAME" });
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
                            {clientSelected && (
                                <button
                                    type="button"
                                    onClick={resetToFreeSaleView}
                                    aria-label="Quitar cliente"
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white text-gray-500 shadow-sm cursor-pointer active:bg-gray-200"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-3 pb-3">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Buscar productos"
                            value={productQuery}
                            onChange={(e) => setProductQuery(e.currentTarget.value)}
                            className="h-11 rounded-xl bg-white pl-9 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {/* 2. Product grid: takes all the space the context selector left
                and scrolls internally, so the account bar never moves. */}
            <div aria-disabled={!jornadaOpen} className={cn("flex-1 overflow-y-auto px-3 pb-3", gated)}>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2">
                    {filteredProducts.map((product) => {
                        const isPending = pendingId === product.id;
                        return (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => handleProductTap(product)}
                                disabled={isPending}
                                className={cn(
                                    "flex min-h-20 flex-col items-start justify-between gap-1 rounded-xl border bg-white p-3 text-left shadow-sm transition-colors cursor-pointer active:bg-gray-300",
                                    isPending && "bg-gray-300"
                                )}
                            >
                                <p className="line-clamp-2 text-sm font-medium text-gray-800">{product.name}</p>
                                <Badge className="shrink-0">${product.price}</Badge>
                            </button>
                        );
                    })}
                </div>
                {filteredProducts.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">No hay productos.</p>
                )}
            </div>

            {/* 3. Bottom bar, pinned above the mobile nav: the open account
                with its live total, or today's charged sales otherwise. */}
            <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-2.5 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                {activeSource ? (
                    <div aria-disabled={!jornadaOpen} className={cn(gated)}>
                        <button
                            type="button"
                            aria-label="Abrir cuenta"
                            onClick={() => { setDebtConfirm(false); setSheetOpen(true); }}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl bg-gray-900 px-4 py-3 text-white shadow-sm transition-colors cursor-pointer active:bg-gray-700"
                        >
                            <span className="min-w-0 truncate text-left">
                                <span className="block text-sm font-semibold">{accountLabel}</span>
                                <span className="block text-xs text-gray-300">
                                    {accountCount} art. · ${accountTotal.toFixed(2)}
                                </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-400 px-3 py-1.5 text-sm font-bold text-black">
                                Cobrar
                                <ChevronUp className="h-4 w-4" />
                            </span>
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        aria-label="Ver pedidos de hoy"
                        onClick={() => setHistoryOpen(true)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm transition-colors cursor-pointer active:bg-gray-100"
                    >
                        <span className="flex min-w-0 items-center gap-2 text-left">
                            <History className="h-5 w-5 shrink-0 text-gray-400" />
                            <span className="truncate text-sm font-semibold text-gray-800">Pedidos de hoy</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-sm tabular-nums text-gray-600">
                            {settledFreeSales.length} · ${settledTotal.toFixed(2)}
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                        </span>
                    </button>
                )}
            </div>

            {/* Account sheet: the open account's lines with quantity controls,
                the payment method and the charge button. Same bottom-sheet
                idiom as the mobile nav menu. */}
            <DialogPrimitive.Root open={sheetOpen} onOpenChange={(open) => { setSheetOpen(open); if (!open) setDebtConfirm(false); }}>
                <DialogPrimitive.Portal>
                    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
                    <DialogPrimitive.Content
                        className={cn(
                            "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-gray-100 bg-white shadow-lg outline-none",
                            "data-[state=open]:animate-in data-[state=closed]:animate-out",
                            "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-300"
                        )}
                    >
                        <div className="flex shrink-0 flex-col items-center pt-3 pb-2">
                            <div className="h-1.5 w-10 rounded-full bg-gray-300" />
                            <div className="mt-3 flex w-full items-center justify-between px-5">
                                <DialogPrimitive.Title className="text-lg font-bold text-gray-900">
                                    Cuenta · {accountLabel}
                                </DialogPrimitive.Title>
                                <DialogPrimitive.Close className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 outline-none">
                                    <X size={18} />
                                    <span className="sr-only">Cerrar</span>
                                </DialogPrimitive.Close>
                            </div>
                        </div>
                        <DialogPrimitive.Description className="sr-only">
                            Detalle de la cuenta abierta: productos, cantidades y cobro.
                        </DialogPrimitive.Description>

                        {accountLines.length === 0 ? (
                            <p className="px-5 py-6 text-center text-sm text-gray-500">
                                Esta cuenta no tiene productos.
                            </p>
                        ) : (
                            <ul className="flex-1 overflow-y-auto px-5">
                                {accountLines.map((line) => (
                                    <li key={line.key} className="border-b border-gray-100 py-3 last:border-0">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="min-w-0 flex-1 text-sm font-medium text-gray-800">
                                                <span className="text-gray-500">{line.quantity}×</span> {line.name}
                                            </p>
                                            <span className="shrink-0 text-sm font-semibold tabular-nums">
                                                ${line.subtotal.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    aria-label="Reducir cantidad"
                                                    onClick={() => handleUpdateQuantity(line.saleId, line.quantity - 1, line.productID)}
                                                    className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-gray-700 shadow-sm cursor-pointer active:bg-gray-200"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>
                                                <span className="w-6 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
                                                <button
                                                    type="button"
                                                    aria-label="Aumentar cantidad"
                                                    onClick={() => handleUpdateQuantity(line.saleId, line.quantity + 1, line.productID)}
                                                    className="flex h-9 w-9 items-center justify-center rounded-full border bg-white text-gray-700 shadow-sm cursor-pointer active:bg-gray-200"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                aria-label="Eliminar línea"
                                                onClick={() => handleDeleteLine(line.saleId)}
                                                className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 cursor-pointer active:bg-red-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="shrink-0 border-t border-gray-100 px-5 pb-6 pt-3">
                            <div className="flex items-center justify-between pb-3">
                                <span className="text-sm font-medium text-gray-700">Método de pago</span>
                                <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setCloseMethod("CASH")}
                                        className={cn(
                                            "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                                            closeMethod === "CASH" ? "bg-emerald-600 text-white" : "text-gray-600"
                                        )}
                                    >
                                        <Banknote className="h-4 w-4" />
                                        Efectivo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCloseMethod("TRANSFER")}
                                        className={cn(
                                            "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                                            closeMethod === "TRANSFER" ? "bg-amber-500 text-white" : "text-gray-600"
                                        )}
                                    >
                                        <CreditCard className="h-4 w-4" />
                                        Transferencia
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pb-3 text-lg font-bold">
                                <span>Total</span>
                                <span className="tabular-nums">${accountTotal.toFixed(2)}</span>
                            </div>

                            <Button
                                onClick={handleCloseAccount}
                                disabled={accountLines.length === 0 || settling}
                                className="h-12 w-full cursor-pointer rounded-xl text-base font-bold"
                            >
                                Cobrar ${accountTotal.toFixed(2)}
                            </Button>

                            <div className="mt-2 flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={resetToFreeSaleView}
                                    className="h-11 flex-1 cursor-pointer rounded-xl"
                                >
                                    Salir de la cuenta
                                </Button>
                                {clientSelected && (
                                    <Button
                                        onClick={() => setDebtConfirm(true)}
                                        disabled={accountLines.length === 0}
                                        className="h-11 flex-1 cursor-pointer rounded-xl bg-amber-500 text-black hover:bg-amber-400"
                                    >
                                        A deuda
                                    </Button>
                                )}
                            </div>

                            {/* Inline confirm instead of a nested alert dialog:
                                one modal at a time on a phone. */}
                            {debtConfirm && clientSelected && (
                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                                    <p className="text-sm text-amber-900">
                                        ¿Enviar la cuenta de &quot;{query}&quot; a deuda? Total: ${accountTotal.toFixed(2)}
                                    </p>
                                    <div className="mt-2 flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setDebtConfirm(false)}
                                            className="h-10 flex-1 cursor-pointer rounded-lg"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={handleToDebt}
                                            className="h-10 flex-1 cursor-pointer rounded-lg bg-amber-500 text-black hover:bg-amber-400"
                                        >
                                            Sí, a deuda
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
            </DialogPrimitive.Root>

            {/* History sheet: today's charged walk-in sales, read-only. The
                desktop shows them in the order table; on the phone they live
                one tap away instead of hogging the screen. */}
            <DialogPrimitive.Root open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogPrimitive.Portal>
                    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
                    <DialogPrimitive.Content
                        className={cn(
                            "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-gray-100 bg-white shadow-lg outline-none",
                            "data-[state=open]:animate-in data-[state=closed]:animate-out",
                            "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom duration-300"
                        )}
                    >
                        <div className="flex shrink-0 flex-col items-center pt-3 pb-2">
                            <div className="h-1.5 w-10 rounded-full bg-gray-300" />
                            <div className="mt-3 flex w-full items-center justify-between px-5">
                                <DialogPrimitive.Title className="text-lg font-bold text-gray-900">
                                    Pedidos de hoy
                                </DialogPrimitive.Title>
                                <DialogPrimitive.Close className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 outline-none">
                                    <X size={18} />
                                    <span className="sr-only">Cerrar</span>
                                </DialogPrimitive.Close>
                            </div>
                        </div>
                        <DialogPrimitive.Description className="sr-only">
                            Ventas libres cobradas hoy.
                        </DialogPrimitive.Description>

                        {settledFreeSales.length === 0 ? (
                            <p className="px-5 py-6 text-center text-sm text-gray-500">
                                Sin ventas libres cobradas hoy.
                            </p>
                        ) : (
                            <ul className="flex-1 space-y-2 overflow-y-auto px-5 pb-6">
                                {settledFreeSales.map((sale) => (
                                    <li key={sale.id} className="rounded-xl border bg-gray-50 p-3">
                                        <ul className="space-y-0.5">
                                            {sale.sale_items.map((item, k) => (
                                                <li key={`${sale.id}-${k}`} className="flex items-center justify-between gap-2 text-sm">
                                                    <span className="min-w-0 flex-1 truncate text-gray-700">
                                                        <span className="text-gray-500">{item.quantity}×</span> {item.products?.name ?? "Producto"}
                                                    </span>
                                                    <span className="shrink-0 tabular-nums text-gray-600">
                                                        ${Number(item.subtotal || 0).toFixed(2)}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-1.5 flex items-center justify-between border-t border-gray-200 pt-1.5 text-sm font-bold">
                                            <span className="font-normal text-gray-500">
                                                {sale.createdAt
                                                    ? new Date(sale.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
                                                    : ""}
                                            </span>
                                            <span className="tabular-nums">${Number(sale.total).toFixed(2)}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
            </DialogPrimitive.Root>
        </div>
    );
}
