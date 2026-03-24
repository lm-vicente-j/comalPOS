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
import { saveSupply } from "@/lib/actions/inventory"
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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@/lib/actions/schemas";
import { Customer } from "@/lib/actions/customers";


export const staffColumns: ColumnDef<User>[] = [
    {
        accessorKey: "name",
        header: "Nombre",
        cell: ({ row }) => <Badge variant="secondary">{row.original.name}</Badge>,

    },
    {
        accessorKey: "role",
        header: "Rol",
        cell: ({ row }) => <Badge variant="secondary">{row.original.role}</Badge>,
    },
    {
        accessorKey: "active",
        header: "Estado",
        cell: ({ row }) => {
            const isActive = row.original.active;
            return (
                <Badge variant={isActive ? "outline" : "destructive"} className={isActive ? "border-green-600 text-green-600" : ""}>
                    {isActive ? "Activo" : "Inactivo"}
                </Badge>
            );
        },
    },
]

export const customerColumns: ColumnDef<Customer>[] = [
    {
        accessorKey: "customerName",
        header: "Cliente",
        cell: ({ row }) => <div className="font-medium">{row.original.customerName}</div>,
    },
    {
        accessorKey: "phone",
        header: "Teléfono",
        cell: ({ row }) => {
            const number = row.original.phone;

            const formatted = number?.replace(/(\d{3})(\d{3})(\d{3})(\d{1})/, "$1-$2-$3-$4");

            return (
                <div className="font-medium">{formatted}</div>
            );
        },

    },
    {
        accessorKey: "currentBalance",
        header: () => <div className="text-right">Saldo</div>,
        cell: ({ row }) => {
            const balance = parseFloat(row.getValue("currentBalance") || "0");
            return <div className={`text-right font-mono ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                ${balance.toFixed(2)}
            </div>;
        },
    },
]


export default function CRMMAngaer({ customers, staff }: { customers: Customer[], staff: User[] }) {

    const [listEditing, setListEditing] = useState<"CUSTOMERS" | "STAFF">("CUSTOMERS");
    const currentData = listEditing === "CUSTOMERS" ? customers : staff;

    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = useState({});
    const [currentItem, setCurrentItem] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: "",
        unitCost: 0,
        currentStock: 0,
        measureUnit: ""
    });

    const currentColumns = listEditing === "CUSTOMERS" ? customerColumns : staffColumns;

    const customerTable = useReactTable({
        data: customers,
        columns: customerColumns,
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

    const staffTable = useReactTable({
        data: staff,
        columns: staffColumns,
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
        customerTable.toggleAllRowsSelected(false);
        staffTable.toggleAllRowsSelected(false);
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

    const isRowSelected = (listEditing === "CUSTOMERS" ? customerTable : staffTable)
        .getSelectedRowModel().rows.length > 0;
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
                                value={(customerTable.getColumn("customerName")?.getFilterValue() as string) ?? ""}
                                onChange={(event) => customerTable.getColumn("customerName")?.setFilterValue(event.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    {customerTable.getHeaderGroups().map(hg => (
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
                                    {customerTable.getRowModel().rows.map(row => (
                                        <TableRow
                                            key={row.id}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                const isSelected = row.getIsSelected();
                                                customerTable.toggleAllRowsSelected(false);
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
                                value={(staffTable.getColumn("name")?.getFilterValue() as string) ?? ""}
                                onChange={(event) => staffTable.getColumn("name")?.setFilterValue(event.target.value)}
                                className="max-w-sm"
                            />
                        </div>
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    {staffTable.getHeaderGroups().map(hg => (
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
                                    {staffTable.getRowModel().rows.map(row => (
                                        <TableRow
                                            key={row.id}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                const isSelected = row.getIsSelected();
                                                staffTable.toggleAllRowsSelected(false);
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
                                    <Input name="name" placeholder="Nombre Completo" />
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
                                    <Input name="pass" type="text" placeholder="Contraseña..." />
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