"use client";

import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Banknote, CreditCard } from "lucide-react";
import { createSale, Sale } from "@/lib/actions/sales";
import { Product } from "@/lib/actions/schemas";
import { useUserStore } from "@/lib/store";

interface DataTableProps {
  data: Product[];
  onSelect: (product: Product) => void;
  tableNumber: number;
  clientName: string;
  clientSelected: boolean;
  customerID: number;
}

export default function DataTable({ data, onSelect, tableNumber, clientSelected, clientName, customerID }: DataTableProps) {

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

  const placedBy = useUserStore((state) => state.id);

  const handleAddSale = async (productId: number, status: any, customerID: number) => {
    const items = [{ productID: productId, quantity: 1 }];

    const isTable = tableNumber > 0;
    const sourceType = isTable
      ? `MESA-${tableNumber}`
      : (clientSelected ? `CL- ${clientName}` : "VENTA_LIBRE");
    const initialStatus = (isTable || clientSelected) ? "UNPAID" : "PAID";

    const result = await createSale(
      items,
      initialStatus,
      sourceType,
      Number(customerID),
      Number(placedBy),
      paymentMethod
    );

    if (!result.success && result.message === "NO_OPEN_JORNADA") {
      alert("No hay jornada activa. Pide al administrador que abra la jornada antes de registrar ventas.");
      return;
    }

    if (paymentMethod === "TRANSFER") {
      setPaymentMethod("CASH");
    }
  };

  return (
    <div className="w-full h-full mx-10">

      <div className="flex flex-wrap items-center gap-3 pt-4">
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

      <ScrollArea className="grid h-[65%] w-full rounded-md border p-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4">
          {dataProducts.map((val: Product, index: any) => (
            <Button
              onClick={() => {
                handleAddSale(val.id ?? -1, "PAID", customerID);
                onSelect(val);
              }}
              variant="outline"
              key={index}
              className="cursor-pointer w-full h-30 flex flex-col items-center justify-center"
            >
              <div className="w-[80%] h-[50%] text-wrap flex items-center justify-center">
                <p>{val.name}</p>
              </div>
              <Badge>${val.price}</Badge>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}