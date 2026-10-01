"use client";
import { ColumnDef, RowData } from "@tanstack/react-table"
import { useState } from "react";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/dialog"


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

import DebtPaymentDialog from "./debt-payment-dialog";


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

function DebtOperations({ debtor }: { debtor: Debtor }) {
  const [menuOpen, setMenuOpen] = useState(false);

      const customerName = debtor.customer?.customerName || "Cliente";

      return (
        <div className="flex items-center justify-center">
          <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-8 w-8 p-0 cursor-pointer">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DebtPaymentDialog debtor={debtor} onAccountClose={() => setMenuOpen(false)} />
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
                      {Array.isArray(debtor.sales) ?
                        (
                          debtor.sales.map((sale) => (
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
    cell: ({ row }) => <DebtOperations debtor={row.original} />
  }
]