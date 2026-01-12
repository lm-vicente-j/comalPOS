"use client";

import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area"

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"
import { createSale, Sale } from "@/lib/actions/sales";
import { Product } from "@/lib/actions/inventory";
import { useUserStore } from "@/lib/store";

interface DataTableProps {
  data: Product[];
  onSelect: (product: Product) => void;
  tableNumber: number;
  clientName: string;
  clientSelected: boolean;
}

export default function DataTable({ data, onSelect, tableNumber, clientSelected, clientName }: DataTableProps) {

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

  const placedBy = useUserStore((state) => state.id)

  const handleAddSale = async (productId: number, status: any, customerID: any) => {
    const items = [{
      productID: productId,
      quantity: 1
    }];

    const isTable = tableNumber > 0;
    const sourceType = isTable ? `MESA_${tableNumber}` : (clientSelected ? `CLIENTE: ${clientName}` : "VENTA_LIBRE");
    const initialStatus = isTable ? "UNPAID" : "PAID";


    await createSale(
      items,
      initialStatus,
      sourceType,
      Number(customerID),
      Number(placedBy)
    );
  }

  return (
    <div className=" w-full h-full mx-10">
      <div className="flex w-full items-center py-4">
        <Input
          placeholder="Buscar productos"
          className="max-w"
          onChange={(e) => setFilterData(e.currentTarget.value)}
        />
      </div>
      <ScrollArea className="grid h-[70%] w-full rounded-md border p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4">
          {
            dataProducts.map((val: Product, index: any) => (
              <Button onClick={() => {
                handleAddSale(val.id ?? -1, "PAID", -1); // Pasamos val.id en lugar de val.sale_items
                onSelect(val);
              }} variant="outline" key={index} className=" cursor-pointer w-full h-30 flex flex-col items-center justify-center">
                <div className="w-[80%] h-[50%] text-wrap flex items-center justify-center">
                  <p>{val.name}</p>
                </div>
                <Badge >${val.price}</Badge>

              </Button>
            ))

          }
        </div>
      </ScrollArea>
    </div>
  );
}