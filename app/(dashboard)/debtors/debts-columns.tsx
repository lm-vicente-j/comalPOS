"use client";
import { Customer } from "@/lib/defs"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { ButtonGroup } from "@/components/ui/button-group";

export const debtsColumns: ColumnDef<Customer>[] = [
  {
    accessorKey: 'customerName',
    header: 'Nombre',
  },
  {
    accessorKey: 'alias',
    header: 'Alias',
  },
  {
    accessorKey: 'lastConsumption',
    header: 'Ultimo consumo',
    cell: ({ row }) => {
      const date = row.getValue("lastConsumption") as Date
      return <div>{date.toLocaleDateString()}</div>
    }
  },
  {
    accessorKey: 'outstandingBalance',
    header: 'Saldo pendiente',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("outstandingBalance"))
      const formatted = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(amount)

      return <div className="font-medium">{formatted}</div>
    },
  },
  {
    header: () => { return (<div className="flex items-center justify-center"><p>Estado</p></div>) },
    id: "status",
    cell: ({ row }) => {


      const currentDate = new Date();
      const lastConsumption = new Date(row.getValue("lastConsumption"));
      const dateDiff: number = currentDate.getTime() - lastConsumption.getTime();
      const diffDays = Math.floor(dateDiff / (1000 * 60 * 60 * 24))

      const status = diffDays >= 15 ? "destructive" : "default";

      return (
        <div className="flex items-center justify-center">
          <Badge variant={status}>
            Pendiente
          </Badge>
        </div>
      )
    }
  },
  {
    header: () => { return (<div className="flex items-center justify-center"><p>Operaciones</p></div>) },
    id: "actions",
    cell: ({ row }) => {

      const customerName: string = row.getValue("customerName");

      return (
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="cursor-pointer h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Dialog >
                  <DialogTrigger className="p-2 text-sm w-full cursor-pointer flex items-center justify-start">Abonar</DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Abono a cuenta de {customerName}</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center gap-2">
                      <div className="grid flex-1 gap-2">
                        <Input placeholder="$0.00" />
                      </div>
                      <div className="grid flex-1 gap-2">
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo de pago" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem className="cursor-pointer" value="transferencia">Transferencia</SelectItem>
                              <SelectItem className="cursor-pointer" value="efectivo">Efectivo</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="sm:justify-start">
                      <DialogClose asChild>
                        <ButtonGroup className="flex w-full gap-2">
                          <Button className="cursor-pointer flex-1" variant="outline">Cancelar</Button>
                          <Button className="cursor-pointer flex-1">Cobrar</Button>
                        </ButtonGroup>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </DropdownMenuItem>
              <Separator />
              <DropdownMenuItem asChild>
                <Dialog >
                  <DialogTrigger className="p-2 text-sm w-full cursor-pointer flex items-center justify-start">Detalles</DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Detalles de consumo de {customerName}</DialogTitle>
                      <DialogDescription>
                        ConsumptionTable here
                      </DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  }
]