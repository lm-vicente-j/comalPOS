"use client";
import { ColumnDef, RowData } from "@tanstack/react-table"

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}
import { Button } from "@/components/ui/button"
import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

import { Debtor } from "@/lib/actions/debts";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Sale } from "@/lib/actions/sales";

import { payAccount } from "@/lib/actions/debts"
import { useState } from "react";
import { PaymentMethod } from "@/app/generated/prisma/enums";


function DebtStatusBadge({ lastConsumption }: { lastConsumption?: string | Date | null }) {
  if (!lastConsumption) return <Badge variant="outline">--</Badge>;

  const dateDiff = new Date().getTime() - new Date(lastConsumption).getTime();
  const diffDays = Math.floor(dateDiff / (1000 * 60 * 60 * 24));

  return (
    <Badge variant={diffDays >= 15 ? "destructive" : "default"}>
      {diffDays >= 15 ? "Moroso" : "Pendiente"}
    </Badge>
  );
}

export const debtsColumns: ColumnDef<Debtor>[] = [
  {
    id: "customer",
    accessorFn: (row) => `${row.customer?.customerName} ${row.customer?.alias}`,
    header: "Cliente",
    cell: ({ row }) => {
      const customer = row.original.customer;
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold whitespace-normal break-words">{customer?.customerName}</span>
          <span className="text-xs text-muted-foreground">{customer?.alias}</span>
          {/* Datos extra visibles solo en móvil, donde sus columnas están ocultas */}
          <div className="flex flex-wrap items-center gap-1.5 md:hidden">
            <DebtStatusBadge lastConsumption={customer?.lastConsumption} />
            {customer?.lastConsumption && (
              <span className="text-xs text-muted-foreground">
                {new Date(customer.lastConsumption).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      );
    }
  },
  {
    accessorKey: 'customer.customerName',
    header: 'Nombre',
    meta: { className: "hidden md:table-cell" },
  },
  {
    accessorKey: 'customer.alias',
    header: 'Alias',
    meta: { className: "hidden md:table-cell" },
  },
  {
    accessorKey: 'customer.lastConsumption',
    header: 'Último consumo',
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => {
      const dateValue = row.original.customer?.lastConsumption;
      if (!dateValue) return <div>-</div>;
      const date = new Date(dateValue);
      return <div>{date.toLocaleDateString()}</div>
    }
  },
  {
    accessorKey: "amount",
    // Short header below md so the table fits very narrow screens
    header: () => (
      <>
        <span className="md:hidden">Monto</span>
        <span className="hidden md:inline">Monto pendiente</span>
      </>
    ),
    cell: ({ row }) => {
      const amount = row.original.amount;
      return <div className="font-bold text-red-600">${amount}</div>
    }
  },
  {
    header: () => <div className="flex items-center justify-center">Estado</div>,
    id: "status",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-center">
          <DebtStatusBadge lastConsumption={row.original.customer?.lastConsumption} />
        </div>
      )
    }
  },
  {
    header: () => (
      <div className="flex items-center justify-center">
        <span className="md:hidden">Ops.</span>
        <span className="hidden md:inline">Operaciones</span>
      </div>
    ),
    id: "actions",
    cell: ({ row }) => {

      const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);

      const customerName = row.original.customer?.customerName || "Cliente";

      const handlePayAccount = async (customerID: number, sales: Sale[]) => {
        await payAccount(customerID, sales, paymentMethod);
      }


      return (
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 w-8 p-0 cursor-pointer">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Dialog>
                <DialogTrigger className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full">
                  Cobrar
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cobrar cuenta de {customerName}</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2 py-4">
                    <label>Total: </label>
                    <p>${Number(row.original.customer?.currentBalance)?.toFixed(2)}</p>
                    <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                      <SelectTrigger className="w-45">
                        <SelectValue placeholder="Tipo de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PaymentMethod.TRANSFER}>Transferencia</SelectItem>
                        <SelectItem value={PaymentMethod.CASH}>Efectivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <div className="flex w-full gap-2">
                        <Button variant="outline" className="flex-1">Cancelar</Button>
                        <Button onClick={() => handlePayAccount(row.original.customerID || -1, (row.original.sales as unknown as Sale[]) || [])} className="flex-1">Registrar Cobro</Button>
                      </div>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Separator />
              <Dialog>
                <DialogTrigger className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full">
                  Detalles
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Historial de {customerName}</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(row.original.sales) ?
                        (
                          row.original.sales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell>{new Date(sale.createdAt!).toLocaleDateString()}</TableCell>
                              <TableCell>
                                {sale.sale_items?.map(item =>
                                  `${item.quantity}x ${item.products?.name}`
                                ).join(", ") || "Sin productos"}
                              </TableCell>
                              <TableCell className="text-right">
                                ${Number(sale.total).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                              Sin cobros pendientes.
                            </TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                  </Table>
                  </div>
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  }
]