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
                        <TableCell className="font-medium">
                            {sale.customerID ?? sale.source_type}
                        </TableCell>

                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.products?.name || "Cargando..."}</TableCell>

                        <TableCell className="text-right">
                            ${Number(item.subtotal || 0).toFixed(2)}
                        </TableCell>
                        
                        <TableCell className="flex items-center justify-center gap-2">
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