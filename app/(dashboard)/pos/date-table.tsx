"use client";

import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/lib/actions/schemas";

interface DataTableProps {
  data: Product[];
  // The parent owns the tap (optimistic add + createSale); this grid is
  // presentational. pendingId darkens the pressed product meanwhile.
  onProductTap: (product: Product) => void;
  pendingId: number | null;
}

export default function DataTable({ data, onProductTap, pendingId }: DataTableProps) {

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
                onClick={() => onProductTap(val)}
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
                onClick={() => onProductTap(val)}
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