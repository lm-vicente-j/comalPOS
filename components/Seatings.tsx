"use client";

import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface TablesProps {
  tableNumber: number;
  setTableNumber: (num: number) => void;
}

// Just the table chips: settling any account (tables included) goes through
// the single "Cerrar cuenta" button next to the customer picker.
export default function Seatings({ tableNumber, setTableNumber }: TablesProps){

    return(
        <>
      {/* Mobile: single horizontally-scrollable row of touch-sized chips.
          Desktop: same row constrained to max-w-2xl as before. */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:max-w-2xl lg:justify-between lg:overflow-visible lg:pb-0">
        {Array.from({ length: 10 }).map((_, index) => {
          const currentTable = index + 1;
          const isSelected = tableNumber === currentTable;

          return (
            <Button
              onClick={() => setTableNumber(currentTable)}
              key={index}
              className={cn(
                "border text-black flex outline cursor-pointer hover:bg-gray-200 items-center justify-center bg-white rounded-sm shrink-0 w-11 h-11 lg:w-10 lg:h-10 transition-colors",
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
    </>
    );
}