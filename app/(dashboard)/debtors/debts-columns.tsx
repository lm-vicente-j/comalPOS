"use client";
import { ColumnDef } from "@tanstack/react-table"
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

export const debtsColumns: ColumnDef<Debtor>[] = [
  {
    id: "customer",
    accessorFn: (row) => `${row.customer?.customerName} ${row.customer?.alias}`,
    header: "Cliente",
    cell: ({ row }) => {
      const customer = row.original.customer;
      return (
        <div className="flex flex-col">
          <span className="font-bold">{customer?.customerName}</span>
          <span className="text-xs text-muted-foreground">{customer?.alias}</span>
        </div>
      );
    }
  },
  {
    accessorKey: 'customer.customerName',
    header: 'Nombre',
  },
  {
    accessorKey: 'customer.alias',
    header: 'Alias',
  },
  {
    accessorKey: 'customer.lastConsumption',
    header: 'Último consumo',
    cell: ({ row }) => {
      const dateValue = row.original.customer?.lastConsumption;
      if (!dateValue) return <div>-</div>;
      const date = new Date(dateValue);
      return <div>{date.toLocaleDateString()}</div>
    }
  },
  {
    accessorKey: "amount",
    header: "Monto pendiente",
    cell: ({ row }) => {
      const amount = row.original.amount;
      return <div className="font-bold text-red-600">${amount.toFixed(2)}</div>
    }
  },
  {
    accessorKey: 'customer.currentBalance',
    header: 'Saldo Total',
    cell: ({ row }) => {
      const amount = row.original.customer?.currentBalance || 0;
      const formatted = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(amount)

      return <div className="font-medium">{formatted}</div>
    },
  },
  {
    header: () => <div className="flex items-center justify-center">Estado</div>,
    id: "status",
    cell: ({ row }) => {
      const lastConsumptionVal = row.original.customer?.lastConsumption;
      if (!lastConsumptionVal) return <Badge variant="outline">Sin registro</Badge>;

      const currentDate = new Date();
      const lastConsumption = new Date(lastConsumptionVal);
      const dateDiff = currentDate.getTime() - lastConsumption.getTime();
      const diffDays = Math.floor(dateDiff / (1000 * 60 * 60 * 24));

      const variant = diffDays >= 15 ? "destructive" : "default";

      return (
        <div className="flex items-center justify-center">
          <Badge variant={variant}>
            {diffDays >= 15 ? "Moroso" : "Pendiente"}
          </Badge>
        </div>
      )
    }
  },
  {
    header: () => <div className="flex items-center justify-center">Operaciones</div>,
    id: "actions",
    cell: ({ row }) => {
      const customerName = row.original.customer?.customerName || "Cliente";

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
                  Abonar
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Abono a cuenta de {customerName}</DialogTitle>
                  </DialogHeader>
                  <div className="flex items-center gap-2 py-4">
                    <Input placeholder="$0.00" type="number" />
                    <Select>
                      <SelectTrigger className="w-45">
                        <SelectValue placeholder="Tipo de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <div className="flex w-full gap-2">
                        <Button variant="outline" className="flex-1">Cancelar</Button>
                        <Button className="flex-1">Registrar Cobro</Button>
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
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Historial de {customerName}</DialogTitle>
                  </DialogHeader>
                  <TableBody>
                    {row.original.sales && row.original.sales.length > 0 ? (
                      row.original.sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">
                            #{sale.id}
                          </TableCell>
                          <TableCell>
                            {sale.createdAt
                              ? new Date(sale.createdAt).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit'
                              })
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {sale.source_type?.toLowerCase().replace("_", " ") || "Venta"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={sale.status === "PAID" ? "secondary" : "outline"}>
                              {sale.status === "DEBT" ? "Adeudo" : sale.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            ${Number(sale.total).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          No hay ventas vinculadas a este deudor.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {row.original.sales?.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{new Date(sale.createdAt!).toLocaleDateString()}</TableCell>
                          <TableCell>{sale.source_type}</TableCell>
                          <TableCell className="text-right">${Number(sale.total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  }
]