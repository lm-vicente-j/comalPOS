"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import { useState } from "react";

import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function () {
    const [date, setDate] = useState<Date>()
    return (

        <div className="flex flex-col items-center justify-around z-0 w-full h-full">
            <div className="flex flex-row items-center justify-center w-full h-[30%]">
                <div className="outline rounded-md w-[95%] h-[80%] flex flex-row items-center justify-around">
                    <div className="flex flex-col items-center justify-center w-full h-full bg-white">
                        <p className="text-muted-foreground text-sm">Gastos del mes</p>
                        <p className="text-2xl font-bold text-red-600">$0.00</p>
                    </div>
                    <Separator orientation="vertical" />
                    <div className="flex flex-col items-center justify-center w-full h-full bg-white">
                        <p className="text-muted-foreground text-sm">Categoria de mayor gasto</p>
                        <p className="text-2xl font-bold">cateoria</p>
                    </div>


                </div>
            </div>
            <div className=" h-[80%] gap-5 flex flex-row w-[95%] rounded-md border p-4 bg-white">
                <div className="flex flex-col gap-5 h-full w-[50%]">

                    <div className="flex flex-row gap-5">
                        <Label>Monto</Label>
                        <Input className="w-45" />
                    </div>
                    <div className="flex flex-row gap-5">
                        <Label>Categoria</Label>
                        <Select>
                            <SelectTrigger className="w-45">
                                <SelectValue placeholder="Theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-row gap-5">
                        <Label>Descripcion</Label>
                        <Input className="w-45" />

                    </div>
                    <div className="flex flex-row gap-5">
                        <Label>Fecha del Gasto</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    data-empty={!date}
                                    className="data-[empty=true]:text-muted-foreground w-70 justify-start text-left font-normal"
                                >
                                    <CalendarIcon />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={date} onSelect={setDate} />
                            </PopoverContent>
                        </Popover>

                    </div>
                    <div className="flex flex-row gap-5">
                        <Label>Registrado por </Label>
                        <p>Usuario</p>

                    </div>

                    <div className="flex flex-row gap-5">
                        <Label>Recibo</Label>
                        <div className="outline w-50 h-5 p-4 flex items-center justify-center rounded-md">
                            Subir recibo
                        </div>

                    </div>
                </div>

                <Separator orientation="vertical" />


                <ScrollArea className="flex h-full w-[50%]">
                    <Table>
                        <TableCaption>A list of your recent invoices.</TableCaption>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-25">Invoice</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell className="font-medium">INV001</TableCell>
                                <TableCell>Paid</TableCell>
                                <TableCell>Credit Card</TableCell>
                                <TableCell className="text-right">$250.00</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </ScrollArea>

            </div>
        </div>

    );
}