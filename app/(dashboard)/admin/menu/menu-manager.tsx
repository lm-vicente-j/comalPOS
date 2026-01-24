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
} from "@tanstack/react-table"
import { ButtonGroup } from "@/components/ui/button-group"
import { ArrowUpDown, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { saveSupply, Supply } from "@/lib/actions/inventory"
import { saveProduct, Product } from "@/lib/actions/products"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandEmpty
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"


const measureUnits = [
    { value: "kg", label: "KILOG" },
    { value: "Lt", label: "LITRO" },
    { value: "piece", label: "PAQU./PIEZA" },
]

import {
    PopoverAnchor,
} from "@/components/ui/popover"

import { useState, useRef, useEffect } from "react"


export const columns: ColumnDef<Supply>[] = [
    {
        id: "select",
        header: () => <div className="pl-1 text-xs font-bold text-muted-foreground">Sel.</div>,
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
        accessorKey: "name",
        header: "Producto",
        cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
        accessorKey: "baseCost",
        header: "Costo base",
        cell: ({ row }) => {
            const cost = parseFloat("0");
            return <div className="text-right font-mono">${cost.toFixed(2)}</div>;
        },
    },
    {
        accessorKey: "finalPrice",
        header: "Precio venta",
        cell: ({ row }) => {
            const cost = parseFloat("0");
            return <div className="text-right font-mono">${cost.toFixed(2)}</div>;
        },
    },
    {
        accessorKey: "profit",
        header: "Utilidad",
        cell: ({ row }) => {
            const cost = parseFloat("0");
            return <div className="text-right font-mono">${cost.toFixed(2)}</div>;
        },
    },
]

interface MenuProps {
    hasSupplies: boolean;
    data: Supply[];
}


export function MenuManager({hasSupplies,data}: MenuProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = React.useState({});
    const [currentItem, setCurrentItem] = React.useState<Supply | null>(null);

    const [formData, setFormData] = React.useState({
        name: "",
        unitCost: 0,
        currentStock: 0,
        measureUnit: ""
    });

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        enableMultiRowSelection: false,
        state: { sorting, columnFilters, rowSelection },
    });

    React.useEffect(() => {
        if (currentItem) {
            setFormData({
                name: currentItem.name || "",
                unitCost: currentItem.unitCost || 0,
                currentStock: currentItem.currentStock || 0,
                measureUnit: currentItem.measureUnit || ""
            });
        } else {
            setFormData({ name: "", unitCost: 0, currentStock: 0, measureUnit: "" });
        }
    }, [currentItem]);

    const resetForm = () => {
        setCurrentItem(null);
        table.toggleAllRowsSelected(false);
        setFormData({ name: "", unitCost: 0, currentStock: 0, measureUnit: "" });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === "name" ? value : parseFloat(value) || 0
        }));
    };

    const handleSave = async () => {
        const response = await saveProduct({
            ...formData,
            id: currentItem?.id
        } as any);

        if (response.success) {
            resetForm();
        } else {
            alert(response.error || "Error al guardar");
        }
    };

    const isRowSelected = table.getSelectedRowModel().rows.length > 0;
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    const isInputDisabled = !hasSupplies;

    const query= "";

    function setQuery(q:string){

    }

    return (
        <div className="flex flex-row items-center justify-around w-full h-full gap-4 p-4">
            <div className="bg-white flex flex-col w-[70%] h-[90%] border rounded-md p-5 shadow-sm">
                <div className="flex w-full items-center py-4">
                    <Input
                        placeholder="Buscar producto..."
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                        className="max-w-sm"
                    />
                </div>
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map(hg => (
                                <TableRow key={hg.id}>
                                    {hg.headers.map(header => (
                                        <TableHead key={header.id}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.map(row => (
                                <TableRow
                                    key={row.id}
                                    className="cursor-pointer"
                                    onClick={() => {
                                        const isSelected = row.getIsSelected();
                                        table.toggleAllRowsSelected(false);
                                        row.toggleSelected(!isSelected);
                                        setCurrentItem(!isSelected ? row.original : null);
                                    }}
                                    data-state={row.getIsSelected() && "selected"}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="bg-white flex flex-col w-[30%] h-[90%] border rounded-md p-6 shadow-sm">

                <form hidden={!isRowSelected} className="h-full w-full flex-col flex flex-1 justify-between">
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-row items-center justify-between">
                            <h2 className="text-xl font-bold">Editar Insumo</h2>
                            <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="text-orange-600 font-bold">+ Nuevo</Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Revise los datos antes de actualizar.</p>
                    </div>
                    <div className="space-y-4 mt-6 flex-1">
                        <div>
                            <label className="text-xs font-semibold uppercase">Costo de produccion</label>
                            <Input name="name" value={formData.name} onChange={handleInputChange} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-semibold uppercase">Costo</label>
                                <Input name="unitCost" type="number" value={formData.unitCost} onChange={handleInputChange} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase">Stock</label>
                                <Input name="currentStock" type="number" value={formData.currentStock} onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>
                    <ButtonGroup className="mt-6 flex gap-2 w-full">
                        <Button type="button" variant="outline" onClick={resetForm} className="flex-1 cursor-pointer">Cancelar</Button>
                        <Button type="button" onClick={handleSave} className="rounderd-sm cursor-pointer">
                            Actualizar
                        </Button>
                    </ButtonGroup>
                </form>

                <form hidden={isRowSelected} className="h-full w-full flex-col flex flex-1 justify-between">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold">Agregar Producto</h2>
                        <p className="text-xs text-muted-foreground">Ingrese los datos del nuevo producto.</p>
                    </div>
                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="text-xs font-semibold uppercase">Nombre</label>
                            <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre del producto..." />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold uppercase">Insumos</label>
                            <Dialog>
                                <DialogTrigger className="relative  flex select-none items-center justify-center font-bold cursor-pointer rounded-sm px-2 py-1.5 text-sm outline transition-colors hover:bg-accent hover:text-accent-foreground w-full">
                                    Editar lista insumos
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Editar lista de insumos de </DialogTitle>
                                    </DialogHeader>
                                    <ScrollArea>
                                        <Popover open={open} onOpenChange={setOpen}>
                                            <PopoverAnchor asChild>
                                                <Input ref={inputRef} type="text"
                                                    placeholder={isInputDisabled ? "No hay insumos registrados" : "Nombre del insumo"}
                                                    disabled={isInputDisabled} value={query} onChange={(e) => {
                                                        setQuery(e.target.value);
                                                        setOpen(true);
                                                    }} className="max-w" />
                                            </PopoverAnchor>
                                            <PopoverContent className="p-0 w-(--radix-popover-trigger-width)" onOpenAutoFocus={(e) => e.preventDefault()} >
                                                <Command>
                                                    <CommandList>
                                                        <CommandEmpty>No se encontraron insumos.</CommandEmpty>
                                                        <CommandGroup>

                                                            {/* {Array.isArray(debtorsList) && debtorsList.length > 0 ? (
                                                                debtorsList.map((item) => (
                                                                    <CommandItem
                                                                        key={item.id}
                                                                        value={item.customer?.customerName || ""}

                                                                        className="cursor-pointer"
                                                                    >
                                                                        {item.customer?.alias} | {item.customer?.customerName}
                                                                    </CommandItem>
                                                                ))
                                                            ) : null}    */}
                                                                                     </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </ScrollArea>
                                    <Button className="cursor-pointer">Agregar insumo</Button>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button className="cursor-pointer">Cerrar</Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="flex flex-row items-center justify-between">
                            <label className="text-xs font-semibold uppercase">Costo base: </label>
                            <p>$ 0.00</p>

                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase">Costo de Venta</label>
                            <Input name="unitCost" type="number" value={formData.unitCost} onChange={handleInputChange} placeholder="0.00" />
                        </div>
                    </div>
                    <ButtonGroup className="mt-6 flex gap-2 w-full">
                        <Button type="button" variant="outline" onClick={resetForm} className="cursor-pointer flex-1 rounderd-sm">Limpiar</Button>
                        <Button type="button" onClick={handleSave} className="rounderd-sm cursor-pointer" >
                            AGREGAR
                        </Button>
                    </ButtonGroup>
                </form>
            </div>
        </div>
    );
}