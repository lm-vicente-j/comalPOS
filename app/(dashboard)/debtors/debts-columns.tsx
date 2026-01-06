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
        cell: ({row}) => {
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
      header: "Estado",
      cell: ({row}) => {
        return(
          <div>
            <Badge>
              Pendiente
            </Badge>
          </div>
        )
      }
    },
    {
        header: "Operaciones",
        id: "actions",
        cell: ({ row }) => {
 
      return (
        <div >
                    <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className=" h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Detalles</DropdownMenuItem>
            <DropdownMenuItem>Abonar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      )
    },
    }
]