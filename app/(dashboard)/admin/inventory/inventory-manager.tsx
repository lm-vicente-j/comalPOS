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
import { saveSupply } from "@/lib/actions/inventory"
import { type Supply } from "@/lib/actions/schemas"
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

import { ScrollArea } from "@/components/ui/scroll-area"

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

export function InventoryManager({ data }: { data: Supply[] }) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = React.useState({});
    const [currentItem, setCurrentItem] = React.useState<Supply | null>(null);

    // Validation State
    const [errors, setErrors] = React.useState<Record<string, string[]>>({});
    const [alert, setAlert] = React.useState<{ message: string, type: 'success' | 'error' } | null>(null);

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
            setErrors({});
            setAlert(null);
        } else {
            setFormData({ name: "", unitCost: 0, currentStock: 0, measureUnit: "" });
        }
    }, [currentItem]);

    const resetForm = () => {
        setCurrentItem(null);
        table.toggleAllRowsSelected(false);
        setFormData({ name: "", unitCost: 0, currentStock: 0, measureUnit: "" });
        setErrors({});
        setAlert(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === "name" ? value : parseFloat(value) || 0
        }));
    };

    const handleSave = async () => {
        setErrors({});
        setAlert(null);

        const response = await saveSupply({
            ...formData,
            id: currentItem?.id
        } as any);


        if (response.success) {
            resetForm();
            setAlert({ message: "Insumo guardado exitosamente.", type: 'success' });
            setTimeout(() => setAlert(null), 4000); // Clear after 4 seconds
        } else {
            setAlert({ message: response.error || "Ocurrió un error.", type: 'error' });
            if (response.fieldErrors) {
                setErrors(response.fieldErrors);
            }
        }
    };

    const isRowSelected = table.getSelectedRowModel().rows.length > 0;

    return (
        <div className="flex flex-row items-center justify-around w-full h-full gap-4 p-4">
            <div className="bg-white flex flex-col w-[70%] h-[90%] border rounded-md p-5 shadow-sm">
                <div className="flex w-full items-center py-4">
                    <Input
                        placeholder="Buscar insumo..."
                        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                        onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
                        className="max-w-sm"
                    />
                </div>
                <div className="rounded-md border flex-1 overflow-y-auto min-h-0">
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
                
                {alert && (
                    <div className={`p-3 rounded mb-4 text-sm font-semibold ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {alert.message}
                    </div>
                )}

                <form hidden={!isRowSelected}  className="h-full w-full flex-col flex flex-1 justify-between">
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
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-semibold uppercase">Costo</label>
                                <Input name="unitCost" type="number" value={formData.unitCost} onChange={handleInputChange} />
                                {errors.unitCost && <p className="text-red-500 text-xs mt-1">{errors.unitCost[0]}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase">Stock</label>
                                <Input name="currentStock" type="number" value={formData.currentStock} onChange={handleInputChange} />
                                {errors.currentStock && <p className="text-red-500 text-xs mt-1">{errors.currentStock[0]}</p>}
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
                        <h2 className="text-xl font-bold">Agregar Insumo</h2>
                        <p className="text-xs text-muted-foreground">Ingrese los datos del nuevo material.</p>
                    </div>
                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="text-xs font-semibold uppercase">Nombre</label>
                            <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre del insumo..." />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                        </div>
                        <div className="flex flex-row gap-2">
                            <div className="flex-1">
                                <label className="text-xs font-semibold uppercase">Stock</label>
                                <Input name="currentStock" type="number" value={formData.currentStock} onChange={handleInputChange} placeholder="0" />
                                {errors.currentStock && <p className="text-red-500 text-xs mt-1">{errors.currentStock[0]}</p>}
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-semibold uppercase">Unidad</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between">
                                            {formData.measureUnit ? measureUnits.find(u => u.value === formData.measureUnit)?.label : "..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0">
                                        <Command>
                                            <CommandList>
                                                <CommandGroup>
                                                    {measureUnits.map(unit => (
                                                        <CommandItem key={unit.value} onSelect={() => {
                                                            setFormData(prev => ({ ...prev, measureUnit: unit.value }));
                                                            setErrors(prev => ({ ...prev, measureUnit: [] }));
                                                        }}>
                                                            {unit.label}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {errors.measureUnit && <p className="text-red-500 text-xs mt-1">{errors.measureUnit[0]}</p>}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase">Costo Unitario</label>
                            <Input name="unitCost" type="number" value={formData.unitCost} onChange={handleInputChange} placeholder="0.00" />
                            {errors.unitCost && <p className="text-red-500 text-xs mt-1">{errors.unitCost[0]}</p>}
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