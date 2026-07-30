import { Button } from "@/components/ui/button";
import { Trash2Icon, PlusIcon, MinusIcon } from "lucide-react";
import { Sale } from "@/lib/actions/sales";
import { TableCell,TableRow } from "@/components/ui/table";
import { formatSourceType } from "@/lib/pos-source";

interface SalesRowProps {
    sales: Sale[];
    // The parent owns the optimistic update + server action; these rows are
    // presentational. Only open (UNPAID) account lines are ever rendered
    // here, so every row can offer its quantity and delete controls.
    onUpdateQuantity: (saleId: number, quantity: number, productId: number) => void;
    onDeleteLine: (saleId: number) => void;
}

export function SalesRow({ sales, onUpdateQuantity, onDeleteLine }: SalesRowProps) {

    return (
        <>
            {sales.map((sale) =>
                sale.sale_items.map((item, k) => (
                    // Negative ids are optimistic placeholders: their
                    // operations stay disabled until the real sale (and its
                    // id) arrives from the server.
                    <TableRow key={`${sale.id}-${k}`} className={sale.id < 0 ? "opacity-60" : undefined}>
                        {/* Hidden on phones: the active filter already gives the context */}
                        <TableCell className="hidden font-medium sm:table-cell">
                            {formatSourceType(sale.source_type)}
                        </TableCell>

                        <TableCell className="px-1 text-center sm:px-2 sm:text-left">{item.quantity}</TableCell>
                        {/* Truncated on narrow screens so the operations column always fits */}
                        <TableCell className="max-w-[72px] truncate px-1 sm:max-w-none sm:px-2">
                            {item.products?.name || "Cargando..."}
                        </TableCell>

                        <TableCell className="px-1 text-right sm:px-2">
                            ${Number(item.subtotal || 0).toFixed(2)}
                        </TableCell>

                        <TableCell className="flex items-center justify-center gap-1 px-1 sm:gap-2 sm:px-2">
                            <Button disabled={sale.id < 0} onClick={()=> onUpdateQuantity(sale.id, item.quantity+1,item.productID)} className="cursor-pointer size-6" variant="outline" size="icon">
                                <PlusIcon className="w-4 h-4" />
                            </Button>
                            <Button disabled={sale.id < 0} onClick={()=> onUpdateQuantity(sale.id, item.quantity-1,item.productID)} className="cursor-pointer size-6" variant="outline" size="icon">
                                <MinusIcon className="w-4 h-4" />
                            </Button>
                            <Button disabled={sale.id < 0} onClick={()=> onDeleteLine(sale.id)} className="cursor-pointer size-6" variant="destructive" size="icon">
                                <Trash2Icon className="w-4 h-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))
            )}
        </>
    );
}
