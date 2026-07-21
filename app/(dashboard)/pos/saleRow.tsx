import { cancelSaleAction , updateSaleQuantity} from "@/lib/actions/sales";
import { Button } from "@/components/ui/button";
import { Trash2Icon, PlusIcon, MinusIcon } from "lucide-react";
import { Sale } from "@/lib/actions/sales";
import { TableCell,TableRow } from "@/components/ui/table";

export function SalesRow({ sales }: { sales: Sale[] }) {

    const handleDelete = async (id: number) =>{
        await cancelSaleAction(id)
    }

    const handleUpdate= async (id: number, quant: number, productId: number) =>{
        await updateSaleQuantity(id,quant,productId)
    }

    

    return (
        <>
            {sales.map((sale) => 
                sale.sale_items.map((item, k) => (
                    <TableRow key={`${sale.id}-${k}`}>
                        {/* Hidden on phones: the active filter already gives the context */}
                        <TableCell className="hidden font-medium sm:table-cell">
                            {sale.source_type}
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
                            <Button onClick={()=> handleUpdate(sale.id, item.quantity+1,item.productID)} className="cursor-pointer size-6" variant="outline" size="icon">
                                <PlusIcon className="w-4 h-4" />
                            </Button>
                            <Button onClick={()=> handleUpdate(sale.id, item.quantity-1,item.productID)} className="cursor-pointer size-6" variant="outline" size="icon">
                                <MinusIcon className="w-4 h-4" />
                            </Button>
                            <Button onClick={()=> handleDelete(sale.id)} className="cursor-pointer size-6" variant="destructive" size="icon">
                                <Trash2Icon className="w-4 h-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))
            )}
        </>
    );
}