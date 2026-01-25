"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect, ChangeEvent } from "react";
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
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const measureUnits = [
    { value: "kg", label: "KILOG" },
    { value: "Lt", label: "LITRO" },
    { value: "piece", label: "PAQU./PIEZA" },
]

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
        header: "Insumo",
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "measureUnit",
        header: "Unidad",
        cell: ({ row }) => <Badge variant="outline">{row.getValue("measureUnit")}</Badge>,
    },
    {
        accessorKey: "unitCost",
        header: "Costo Unitario",
        cell: ({ row }) => {
            const cost = parseFloat(row.getValue("unitCost") || "0");
            return <div className="text-right font-mono">${cost.toFixed(2)}</div>;
        },
    },
    {
        accessorKey: "currentStock",
        header: "Stock Actual",
        cell: ({ row }) => <div className="text-right font-bold">{row.getValue("currentStock")}</div>,
    },
]



export default function CRMMAngaer({ data }: { data: Supply[] }) {

    const [listEditing, setListEditing] = useState("CUSTOMERS");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = useState({});
    const [currentItem, setCurrentItem] = useState<Supply | null>(null);

    const [formData, setFormData] = useState({
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

    useEffect(() => {
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

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === "name" ? value : parseFloat(value) || 0
        }));
    };

    const handleSave = async () => {
        const response = await saveSupply({
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
    return (

        <div className="flex flex-row items-center justify-around w-full h-full gap-4 p-4">
            <div className="bg-white flex flex-col w-[70%] h-[90%] border rounded-md p-5 shadow-sm">
                <Tabs defaultValue="customers" className="w-100%">
                    <TabsList>
                        <TabsTrigger onClick={() => setListEditing("CUSTOMERS")} className="cursor-pointer" value="customers">Clientes</TabsTrigger>
                        <TabsTrigger onClick={() => setListEditing("STAFF")} className="cursor-pointer" value="staff">Empleados</TabsTrigger>
                    </TabsList>
                    <TabsContent value="customers" className="">
                        <div className="flex w-full items-center py-4">
                            <Input
                                placeholder="Buscar cliente..."
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
                    </TabsContent>
                    <TabsContent value="staff">
                        <div className="flex w-full items-center py-4">
                            <Input
                                placeholder="Buscar empleado..."
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
                    </TabsContent>
                </Tabs>
            </div>
            <div className="bg-white flex flex-col w-[30%] h-[90%] border rounded-md p-6 shadow-sm">
                {listEditing === "CUSTOMERS" && (
                    <>
                        <form hidden={!isRowSelected} className="h-full w-full flex-col flex flex-1 justify-between">
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-row items-center justify-between">
                                    <h2 className="text-xl font-bold">Editar Cliente</h2>
                                    <Button type="button" variant="ghost" size="sm" onClick={resetForm} className="text-orange-600 font-bold">+ Nuevo</Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Revise los datos antes de actualizar.</p>
                            </div>
                            <div className="space-y-4 mt-6 flex-1">
                                <div>
                                    <label className="text-xs font-semibold uppercase">Nombre</label>
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
                                <h2 className="text-xl font-bold">Registrar Nuevo Cliente</h2>
                                <p className="text-xs text-muted-foreground">Ingrese los datos del nuevo cliente.</p>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="text-xs font-semibold uppercase">Nombre</label>
                                    <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre Completo" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase">NUMERO DE CELULAR</label>
                                    <Input name="unitCost" type="text" placeholder="XXXX-XXXX-XX" />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-semibold uppercase">NOTA:</label>
                                    <textarea name="" id="" className="outline p-2 rounded-md h-30"></textarea>
                                </div>
                            </div>
                            <ButtonGroup className="mt-6 flex gap-2 w-full">
                                <Button type="button" variant="outline" onClick={resetForm} className="cursor-pointer flex-1 rounderd-sm">Limpiar</Button>
                                <Button type="button" onClick={handleSave} className="rounderd-sm cursor-pointer" >
                                    Registrar Nuevo Cliente
                                </Button>
                            </ButtonGroup>
                        </form>
                    </>
                )}
                {listEditing === "STAFF" && (
                    <>
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
                                    <label className="text-xs font-semibold uppercase">Nombre</label>
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
                                <h2 className="text-xl font-bold">Registrar Nuevo Empleado</h2>
                                <p className="text-xs text-muted-foreground">Ingrese los datos del nuevo empleado.</p>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div>
                                    <label className="text-xs font-semibold uppercase">Nombre</label>
                                    <Input name="name"   placeholder="Nombre Completo" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase">Rol</label>
                                    <Select>
                                        <SelectTrigger className="w-45">
                                            <SelectValue placeholder="Seleccionar Rol" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="staff">Staff</SelectItem>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold uppercase">Constraseña</label>
                                    <Input name="pass" type="text"  placeholder="Contraseña..." />
                                </div>
                            </div>
                            <ButtonGroup className="mt-6 flex gap-2 w-full">
                                <Button type="button" variant="outline" onClick={resetForm} className="cursor-pointer flex-1 rounderd-sm">Limpiar</Button>
                                <Button type="button" onClick={handleSave} className="rounderd-sm cursor-pointer" >
                                    Registrar Nuevo Empleado
                                </Button>
                            </ButtonGroup>
                        </form>
                    </>
                )}
            </div>
        </div>


    );
}