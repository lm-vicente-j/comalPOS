"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const invoices = [
  {
    invoice: "INV001",
    paymentStatus: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV002",
    paymentStatus: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV003",
    paymentStatus: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV004",
    paymentStatus: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    invoice: "INV005",
    paymentStatus: "Paid",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
  {
    invoice: "INV006",
    paymentStatus: "Pending",
    totalAmount: "$200.00",
    paymentMethod: "Bank Transfer",
  },
  {
    invoice: "INV007",
    paymentStatus: "Unpaid",
    totalAmount: "$300.00",
    paymentMethod: "Credit Card",
  },
]

export function TableDemo() {
  return (
    <Table>
      <TableCaption>Historial de pagos.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-25">Fecha</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
          <TableRow>
            <TableCell className="font-medium">INV099</TableCell>
            <TableCell>PAgado</TableCell>
            <TableCell>---</TableCell>
            <TableCell className="text-right">50</TableCell>
          </TableRow>
      </TableBody>
      
    </Table>
  )
}


export default function Home() {

    const [userName, setUserName] = useState("Nombre--");
    const [registeredAt, setRegisteredAt] = useState("19 Julio 2026");

    return (
        <div className="flex items-center justify-center z-0 w-full h-full ">
            <div className="flex flex-col items-center justify-around h-[80%] outline rounded-md bg-white w-[95%]">
                <div className="w-[90%] flex flex-col p-2 itmes">
                    <label className="block text-sm font-medium text-gray-700"> Nombre del empleado</label>
                    <Input type="text" placeholder="Buscar empleado..." />
                </div>
                <div className="w-full h-full flex flex-row items-center justify-center">
                    <div className="h-full w-[50%] flex flex-col items-start justify-start gap-5">
                        <div className="w-full flex flex-row gap-5 justify-between px-5">
                            <Input type="text" className="w-50" placeholder="$0.00" />
                            <Button type="button" className="cursor-pointer">Adelantar Sueldo</Button>
                        </div>
                        <div className="w-full flex flex-row gap-5 justify-between px-5">
                            <Input type="text" className="w-50" placeholder="Porcentaje de aumento" />
                            <Button type="button" className="cursor-pointer">Establecer Aumento</Button>
                        </div>
                        <div className="w-full flex flex-row gap-5 justify-between px-5">
                            <Input type="text" className="w-50" placeholder="$0.00" />
                            <Input type="text" placeholder="Motivo del bono..." />
                            <Button type="button" className="cursor-pointer">Otorgar bono</Button>
                        </div>
                    </div>
                    <Separator orientation="vertical" />
                    <div className="h-full w-[50%] flex flex-col items-start p-4 gap-5">
                        <p>Nombre: {userName}</p>
                        <p>Fecha de ingreso: {registeredAt}</p>
                        <p>Antiguedad: 10 años</p>
                        <ScrollArea className=" h-[50%] w-full rounded-md border p-4 bg-white">
                            <TableDemo/>
                        </ScrollArea>
                    </div>
                </div>


            </div>
        </div>

    );
}