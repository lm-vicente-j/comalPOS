"use client"

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"

const clientsSample = ["C1 | Cliente 1","C2 | Cliente 2","C3 | Cliente 3","C4 | Cliente 4"]
interface SalesInputProps {
    query: string;
    setQuery: (val: string) => void;
    clientSelected: boolean;
    setClientSelected: (val: boolean) => void;
    onClientSelect: (name: string) => void;
    tableNumber: number;
    setTableNumber: (val: number) => void;
}

export default function SalesInputClient({ query, setQuery, clientSelected, setClientSelected, onClientSelect, tableNumber, setTableNumber }: SalesInputProps) {

    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(()=>{
        inputRef.current?.focus();
    }, []);

    const [open, setOpen] = useState(false);

    const filtered = clientsSample.filter((s) => s.toLowerCase().includes(query.toLowerCase()) && query.length > 0)

    const isAlreadyFreeSale = tableNumber === 0 && !clientSelected && query === "";

    return(

                <div className=" h-20 flex flex-col items-start justify-between my-5">
                    <Popover open={open && filtered.length > 0} onOpenChange={setOpen}>
                        <PopoverAnchor asChild>
                            <Input ref={inputRef} type="text" placeholder="Nombre de cliente" value={query} onChange={(e) => {
                                setQuery(e.target.value);
                                setOpen(true);
                            }} className="max-w"/>
                        </PopoverAnchor>
                        <PopoverContent className="p-0 w-(--radix-popover-trigger-width)" onOpenAutoFocus={(e) => e.preventDefault()} >
                            <Command>
                                <CommandList>
                                <CommandGroup>
                                    {filtered.map((item) => (
                                    <CommandItem
                                        key={item}
                                        value={item}
                                        onSelect={() => {
                                        onClientSelect(item); 
                                        setClientSelected(true);
                                        setTableNumber(0);
                                        setOpen(false);
                                    }}
                                        
                                        className="cursor-pointer"
                                    >
                                        {item}
                                    </CommandItem>
                                    ))}
                                </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <ButtonGroup>
                        <Button className="cursor-pointer" disabled={!clientSelected && query==="" && tableNumber === 0} onClick={() => {
                            setClientSelected(false);
                            setQuery("");
                            setTableNumber(0);
                                
                        }} >Cambiar a venta libre</Button>

                    </ButtonGroup>
                </div>
    );
}