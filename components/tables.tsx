"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface TablesProps {
  tableNumber: number;
  setTableNumber: (num: number) => void;
}

export default function Tables({ tableNumber, setTableNumber }: TablesProps){

    return(
        <>
      <div className="flex items-center justify-between max-w-2xl gap-2">
        {Array.from({ length: 10 }).map((_, index) => {
          const currentTable = index + 1;
          const isSelected = tableNumber === currentTable;

          return (
            <Button
              onClick={() => setTableNumber(currentTable)}
              key={index}
              className={cn(
                "border text-black flex outline cursor-pointer hover:bg-gray-200 items-center justify-center bg-white rounded-sm w-10 h-10 transition-colors",
                {
                  "bg-amber-300 text-black border-amber-300 hover:bg-amber-400": isSelected,
                }
              )}
            >
              {currentTable}
            </Button>
          );
        })}
      </div>

      <Button 
        disabled={tableNumber === 0} 
        className="cursor-pointer mt-5"
        onClick={()=> {

          setTableNumber(0)  

        }}
      >
        Cerrar Mesa {tableNumber > 0 && `#${tableNumber}`}
      </Button>
    </>
    );
}