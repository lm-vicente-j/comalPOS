"use client"
import * as React from "react"
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type ColumnFiltersState,
    type SortingState,
    type VisibilityState,
} from "@tanstack/react-table"
import { ButtonGroup } from "@/components/ui/button-group"
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const data: Payment[] = [
    {
        id: "m5gr84i9",
        amount: 316,
        status: "success",
        email: "ken99@example.com",
    },
    {
        id: "3u1reuv4",
        amount: 242,
        status: "success",
        email: "Abe45@example.com",
    },
    {
        id: "derv1ws0",
        amount: 837,
        status: "processing",
        email: "Monserrat44@example.com",
    },
    {
        id: "5kma53ae",
        amount: 874,
        status: "success",
        email: "Silas22@example.com",
    },
    {
        id: "bhqecj4p",
        amount: 721,
        status: "failed",
        email: "carmella@example.com",
    },
    {
        id: "5kma53ae",
        amount: 874,
        status: "success",
        email: "Silas22@example.com",
    },
    {
        id: "bhqecj4p",
        amount: 721,
        status: "failed",
        email: "carmella@example.com",
    },
    {
        id: "5kma53ae",
        amount: 874,
        status: "success",
        email: "Silas22@example.com",
    },
    {
        id: "bhqecj4p",
        amount: 721,
        status: "failed",
        email: "carmella@example.com",
    },
    {
        id: "5kma53ae",
        amount: 874,
        status: "success",
        email: "Silas22@example.com",
    },
    {
        id: "bhqecj4p",
        amount: 721,
        status: "failed",
        email: "carmella@example.com",
    },
    {
        id: "5kma53ae",
        amount: 874,
        status: "success",
        email: "Silas22@example.com",
    },
    {
        id: "bhqecj4p",
        amount: 721,
        status: "failed",
        email: "carmella@example.com",
    },
    {
        id: "5kma53ae",
        amount: 874,
        status: "success",
        email: "Silas22@example.com",
    },
    {
        id: "bhqecj4p",
        amount: 721,
        status: "failed",
        email: "carmella@example.com",
    },
    {
        id: "5kma53ae",
        amount: 874,
        status: "success",
        email: "Silas22@example.com",
    },
    {
        id: "bhqecj4p",
        amount: 721,
        status: "failed",
        email: "carmella@example.com",
    },
]
export type Payment = {
    id: string
    amount: number
    status: "pending" | "processing" | "success" | "failed"
    email: string
}

export const columns: ColumnDef<Payment>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <div className="pl-1 text-xs font-bold text-muted-foreground">Sel.</div>
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
                className="rounded-full"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => (
            <div className="capitalize">{row.getValue("status")}</div>
        ),
    },
    {
        accessorKey: "email",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Nombre
                    <ArrowUpDown />
                </Button>
            )
        },
        cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
    },
    {
        accessorKey: "measureUnit",
        header: "Unidad"

    },
    {
        accessorKey: "amount",
        header: () => <div className="text-right">Cantidad</div>,
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("amount"))

            return <div className="text-right font-medium">{amount}</div>
        },
    },
]


export default function Home() {
    const [formData, setFormData] = React.useState({
        email: "",
        amount: 0
    });

    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
        []
    )
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const table = useReactTable({
        enableMultiRowSelection: false,
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
    })

    const [currentItem, setCurrentItem] = React.useState<Payment | null>();
    React.useEffect(() => {
        if (currentItem) {
            setFormData({
                email: currentItem.email,
                amount: currentItem.amount
            });
        } else {
            setFormData({ email: "", amount: 0 });
        }
    }, [currentItem]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === "amount" ? parseFloat(value) || 0 : value
        }));
    };

    const isRowSelected = table.getSelectedRowModel().rows.length > 0;
    return (
        <div className="flex flex-row items-center justify-around z-0 w-full h-full">

            <div className="bg-white  flex flex-col items-center justify-center w-[70%] h-[90%] outline rounded-sm mx-5 p-5">
                <div className="flex w-full items-center py-4">
                    <Input
                        placeholder="Buscar insumo..."
                        value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
                        onChange={(event) =>
                            table.getColumn("email")?.setFilterValue(event.target.value)
                        }
                        className="max-w-sm"
                    />
                    <DropdownMenu>

                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => {
                                                column.toggleVisibility(!!value)
                                            }
                                            }
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="w-full overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} >
                                    {headerGroup.headers.map((header) => {
                                        return (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow className="cursor-pointer"
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        onClick={(e) => {
                                            table.toggleAllRowsSelected(false)
                                            row.toggleSelected(true)
                                            setCurrentItem(row.original)

                                        }}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center"
                                    >
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className=" w-full flex items-center justify-end space-x-2 py-4">
                    <div className="text-muted-foreground flex-1 text-sm">
                        {table.getFilteredSelectedRowModel().rows.length} of{" "}
                        {table.getFilteredRowModel().rows.length} row(s) selected.
                    </div>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>


            <div className="bg-white flex flex-row items-center justify-center w-[30%] h-[90%] rounded-sm mx-5 p-5 outline">
                <form action="" hidden={!isRowSelected} className="h-full w-full flex-col flex flex-1 justify-between gap-10">
                    <div className=" flex flex-col gap-5">
                        <h2 className="text-2xl">Editar </h2>
                        <p className="text-sm">Revise que los datos sean correctos antes de actualizar.</p>
                    </div>
                    <div className="flex flex-1 flex-col gap-10">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre</label>
                            <input
                                disabled={!isRowSelected}
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Nombre del producto..."
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <input
                                    disabled={!isRowSelected}
                                    name="email"
                                    type="email"
                                    placeholder="0.00"
                                    value={isRowSelected ? currentItem?.amount : ""}
                                    required
                                    className="pl-7 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    <ButtonGroup className="flex flex-1 flex-row w-full" >
                        <Button variant={"outline"} className="w-[50%]" disabled={!isRowSelected}>Eliminar</Button>
                        <Button className="w-[50%]" disabled={!isRowSelected}> Actualizar</Button>
                    </ButtonGroup>
                </form>
                <form action="" hidden={isRowSelected} className="h-full w-full flex-col flex flex-1 justify-between gap-10">
                    <div className="flex flex-col gap-5">
                        <h2 className="text-2xl">Agregar Insumo </h2>
                        <p className="text-sm">Revise que los datos sean correctos antes de actualizar.</p>
                    </div>
                    <div className="flex flex-1 flex-col gap-10">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nombre</label>
                            <input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Nombre del insumo..."
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <input
                                    name="email"
                                    type="email"
                                    placeholder="0.00"
                                    required
                                    className="pl-7 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    <ButtonGroup className="flex flex-1 flex-row w-full" >
                        <Button variant={"outline"} className="w-[50%]" disabled={!isRowSelected}>Limpiar campos</Button>
                        <Button className="w-[50%]" disabled={!isRowSelected}> Agregar</Button>
                    </ButtonGroup>
                </form>
            </div>


        </div>

    );
}