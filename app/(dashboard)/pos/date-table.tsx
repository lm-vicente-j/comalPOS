"use client";

import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area"

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"


export type Product = {
  name: string
  price: number

}

export default function DataTable({ data }: { data: any[] }) {

  const [dataProducts, setDataProducts] = useState(data);

  function setFilterData(query: string) {
    const searchLower = query.trim().toLowerCase();
    if (searchLower === "") {
      setDataProducts(data);
      return;
    }
    console.log(data[0]);
    const filteredData = data.filter((p) => p.name.toLowerCase().includes(searchLower));
    setDataProducts(filteredData);

  }

  return (
    <div className=" w-full h-full mx-20">
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
            dataProducts.map((val: any, index: any) => (
              <Button variant="outline" key={index} className=" cursor-pointer w-full h-30 flex flex-col items-center justify-center">
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