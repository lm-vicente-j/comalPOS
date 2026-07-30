"use client";

import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSale } from "@/lib/actions/sales";
import { Product } from "@/lib/actions/schemas";

interface DataTableProps {
  data: Product[];
  // Resolves the account the sale belongs to, opening a walk-in ticket when
  // nothing is selected. Null means the sale can't be registered right now.
  ensureSourceType: () => Promise<string | null>;
  customerID: number;
}

export default function DataTable({ data, ensureSourceType, customerID }: DataTableProps) {

  const router = useRouter();
  const [dataProducts, setDataProducts] = useState(data);

  function setFilterData(query: string) {
    const searchLower = query.trim().toLowerCase();
    if (searchLower === "") {
      setDataProducts(data);
      return;
    }
    const filteredData = data.filter((p) => p.name.toLowerCase().includes(searchLower));
    setDataProducts(filteredData);
  }

  // Per-tap feedback: the pressed product simply darkens while the sale is
  // being registered (and taps are ignored meanwhile).
  const [pendingId, setPendingId] = useState<number | null>(null);

  const handleProductTap = async (product: Product) => {
    if (pendingId !== null) return;
    const productId = product.id ?? -1;

    setPendingId(productId);
    try {
      await handleAddSale(productId, customerID);
    } finally {
      setPendingId(null);
    }
  };

  const handleAddSale = async (productId: number, customerID: number) => {
    // Every sale now lands in an account (table, customer or walk-in ticket)
    // and stays UNPAID until it is charged, so the payment method is picked
    // once at checkout instead of before each tap.
    const sourceType = await ensureSourceType();
    if (!sourceType) return false;

    const items = [{ productID: productId, quantity: 1 }];

    // placedBy ya no viaja desde el cliente: el servidor lo toma de la sesión.
    const result = await createSale(
      items,
      "UNPAID",
      sourceType,
      Number(customerID)
    );

    if (!result.success) {
      if (result.message === "NO_OPEN_JORNADA") {
        alert("No hay jornada activa. Pide al administrador que abra la jornada antes de registrar ventas.");
      } else {
        alert("No se pudo registrar la venta. Revisa la consola del servidor para más detalle.");
      }
      return false;
    }

    // Forzar refetch del server component para que la nueva venta
    // aparezca en la "Lista de pedidos recientes".
    router.refresh();
    return true;
  };

  return (
    <div className="w-full lg:h-full lg:mx-10">

      <div className="flex w-full items-center pt-2 pb-4 lg:pt-4">
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
            return (
              <Button
                onClick={() => handleProductTap(val)}
                disabled={isPending}
                variant="outline"
                key={val.id}
                className={`cursor-pointer w-full h-30 flex flex-col items-center justify-center transition-colors active:bg-gray-300 ${isPending ? "bg-gray-300" : ""}`}
              >
                <div className="w-[80%] h-[50%] text-wrap flex items-center justify-center">
                  <p>{val.name}</p>
                </div>
                <Badge>${val.price}</Badge>
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Mobile (< lg): vertical list, same card style as the other mobile
          modules. Plain overflow-y-auto instead of ScrollArea: Radix wraps
          content in a display:table div sized to the intrinsic content
          width, which defeats truncation and cut the price badges off on
          narrow screens with long product names. */}
      <div className="lg:hidden h-[45vh] w-full overflow-y-auto rounded-md border p-2">
        <div className="flex flex-col gap-2">
          {dataProducts.map((val: Product) => {
            const isPending = pendingId === val.id;
            return (
              <button
                type="button"
                onClick={() => handleProductTap(val)}
                disabled={isPending}
                key={val.id}
                className={`w-full p-4 rounded-xl shadow-sm border flex justify-between items-center gap-2 text-left transition-colors active:bg-gray-300 ${isPending ? "bg-gray-300" : "bg-white"}`}
              >
                <p className="min-w-0 flex-1 font-medium text-gray-800 truncate">{val.name}</p>
                <Badge className="shrink-0">${val.price}</Badge>
              </button>
            );
          })}
          {dataProducts.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-8">No hay productos.</p>
          )}
        </div>
      </div>
    </div>
  );
}