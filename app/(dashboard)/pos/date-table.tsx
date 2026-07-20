"use client";

import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Banknote, CheckIcon, CreditCard, Loader2Icon } from "lucide-react";
import { createSale, Sale } from "@/lib/actions/sales";
import { Product } from "@/lib/actions/schemas";

interface DataTableProps {
  data: Product[];
  onSelect: (product: Product) => void;
  tableNumber: number;
  clientName: string;
  clientSelected: boolean;
  customerID: number;
}

export default function DataTable({ data, onSelect, tableNumber, clientSelected, clientName, customerID }: DataTableProps) {

  const router = useRouter();
  const [dataProducts, setDataProducts] = useState(data);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");

  function setFilterData(query: string) {
    const searchLower = query.trim().toLowerCase();
    if (searchLower === "") {
      setDataProducts(data);
      return;
    }
    const filteredData = data.filter((p) => p.name.toLowerCase().includes(searchLower));
    setDataProducts(filteredData);
  }

  // Per-tap feedback: the pressed product shows a spinner while the sale is
  // registered and a short green check once it lands.
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);

  const handleProductTap = async (product: Product) => {
    if (pendingId !== null) return;
    const productId = product.id ?? -1;

    setPendingId(productId);
    onSelect(product);
    const ok = await handleAddSale(productId, "PAID", customerID);
    setPendingId(null);

    if (ok) {
      setAddedId(productId);
      setTimeout(() => setAddedId((cur) => (cur === productId ? null : cur)), 800);
    }
  };

  const handleAddSale = async (productId: number, status: any, customerID: number) => {
    const items = [{ productID: productId, quantity: 1 }];

    const isTable = tableNumber > 0;
    const sourceType = isTable
      ? `MESA_${tableNumber}`
      : (clientSelected ? `CL- ${clientName}` : "VENTA_LIBRE");
    const initialStatus = (isTable || clientSelected) ? "UNPAID" : "PAID";

    // placedBy ya no viaja desde el cliente: el servidor lo toma de la sesión.
    const result = await createSale(
      items,
      initialStatus,
      sourceType,
      Number(customerID),
      paymentMethod
    );

    if (!result.success) {
      if (result.message === "NO_OPEN_JORNADA") {
        alert("No hay jornada activa. Pide al administrador que abra la jornada antes de registrar ventas.");
      } else {
        alert("No se pudo registrar la venta. Revisa la consola del servidor para más detalle.");
      }
      return false;
    }

    if (paymentMethod === "TRANSFER") {
      setPaymentMethod("CASH");
    }

    // Forzar refetch del server component para que la nueva venta
    // aparezca en la "Lista de pedidos recientes".
    router.refresh();
    return true;
  };

  return (
    <div className="w-full lg:h-full lg:mx-10">

      <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-4">
        <span className="text-sm font-medium text-gray-700">Próxima venta:</span>
        <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setPaymentMethod("CASH")}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
              paymentMethod === "CASH"
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Banknote className="h-4 w-4" />
            Efectivo
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("TRANSFER")}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
              paymentMethod === "TRANSFER"
                ? "bg-amber-500 text-white animate-pulse"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Transferencia
          </button>
        </div>
        {paymentMethod === "TRANSFER" && (
          <span className="text-xs text-amber-700 font-medium">
            La próxima venta se cobra por transferencia, luego vuelve a Efectivo
          </span>
        )}
      </div>

      <div className="flex w-full items-center py-4">
        <Input
          placeholder="Buscar productos"
          className="max-w"
          onChange={(e) => setFilterData(e.currentTarget.value)}
        />
      </div>

      {/* Desktop (lg+): product grid */}
      <ScrollArea className="hidden lg:grid h-[65%] w-full rounded-md border p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-4">
          {dataProducts.map((val: Product) => {
            const isPending = pendingId === val.id;
            const isAdded = addedId === val.id;
            return (
              <Button
                onClick={() => handleProductTap(val)}
                disabled={isPending}
                variant="outline"
                key={val.id}
                className={`cursor-pointer w-full h-30 flex flex-col items-center justify-center transition-all active:scale-95 ${
                  isAdded ? "ring-2 ring-emerald-500 bg-emerald-50" : ""
                } ${isPending ? "opacity-60" : ""}`}
              >
                <div className="w-[80%] h-[50%] text-wrap flex items-center justify-center">
                  <p>{val.name}</p>
                </div>
                {isPending ? (
                  <Loader2Icon className="h-4 w-4 animate-spin text-gray-500" />
                ) : isAdded ? (
                  <Badge className="bg-emerald-600"><CheckIcon className="h-3 w-3" /> Agregado</Badge>
                ) : (
                  <Badge>${val.price}</Badge>
                )}
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Mobile (< lg): vertical list, same card style as the other mobile modules */}
      <ScrollArea className="lg:hidden h-[45vh] w-full rounded-md border p-2">
        <div className="flex flex-col gap-2">
          {dataProducts.map((val: Product) => {
            const isPending = pendingId === val.id;
            const isAdded = addedId === val.id;
            return (
              <button
                type="button"
                onClick={() => handleProductTap(val)}
                disabled={isPending}
                key={val.id}
                className={`w-full bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center gap-2 text-left transition-all active:scale-[0.98] active:bg-gray-50 ${
                  isAdded ? "ring-2 ring-emerald-500 bg-emerald-50" : ""
                } ${isPending ? "opacity-60" : ""}`}
              >
                <p className="min-w-0 flex-1 font-medium text-gray-800 truncate">{val.name}</p>
                {isPending ? (
                  <Loader2Icon className="h-4 w-4 shrink-0 animate-spin text-gray-500" />
                ) : isAdded ? (
                  <Badge className="shrink-0 bg-emerald-600"><CheckIcon className="h-3 w-3" /> Agregado</Badge>
                ) : (
                  <Badge className="shrink-0">${val.price}</Badge>
                )}
              </button>
            );
          })}
          {dataProducts.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-8">No hay productos.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}