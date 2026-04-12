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
import { ArrowUpDown, ChevronsUpDown, HamIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { saveSupply } from "@/lib/actions/inventory"
import { saveProduct } from "@/lib/actions/products"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Supply, Product } from "@/lib/actions/schemas"

import {
    CommandInput,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
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

import { PlusIcon, MinusIcon } from "lucide-react"

import {
    PopoverAnchor,
} from "@/components/ui/popover"

import { useState, useRef, useEffect } from "react"

import clsx from "clsx"


type RecipeItem = {
    supply: Supply;
    quantityUsed: number;
};

export const columns: ColumnDef<any>[] = [
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
        accessorKey: "stock",
        header: "Stock",
        cell: ({ row }) => <div className="font-medium text-center">0</div>,
    },
    {
        accessorKey: "baseCost",
        header: "Costo base",
        cell: ({ row }) => {
            const recipes = row.original.recipes;
            const cost = recipes.reduce((acc: number, r: any) => {
                const unitCost = Number(r.supplies?.unitCost);
                const qty = Number(r.quantityUsed);
                return acc + (unitCost * qty);
            }, 0);

            return <div className="text-right font-mono">${cost.toFixed(2)}</div>;
        },
    },
    {
        accessorKey: "finalPrice",
        header: "Precio venta",
        cell: ({ row }) => {
            const price = Number(row.original.price) || 0;
            return <div className="text-right font-mono">${price.toFixed(2)}</div>;
        },
    },
    {
        accessorKey: "profit",
        header: "Utilidad",
        cell: ({ row }) => {
            const price = Number(row.original.price) || 0;
            const recipes = row.original.recipes || [];
            const baseCost = recipes.reduce((acc: number, r: any) => {
                const unitCost = Number(r.supplies?.unitCost) || 0;
                const qty = Number(r.quantityUsed) || 0;
                return acc + (unitCost * qty);
            }, 0);
            const profit = price - baseCost;
            return <div className="text-right font-mono">${profit.toFixed(2)}</div>;
        },
    },
]

interface MenuProps {
    products: any[];
    supplies: Supply[];
}


function InputSupply({
    supplyList,
    recipeItems,
    setRecipeItems
}: {
    supplyList: Supply[],
    recipeItems: RecipeItem[],
    setRecipeItems: React.Dispatch<React.SetStateAction<RecipeItem[]>>
}) {
    const [visible, setVisible] = useState(false);
    const [value, setValue] = useState("");
    const [selectedFromList, setSelectedFromList] = useState<Supply | null>(null);

    const handleAddSupply = () => {
        if (!selectedFromList) return;

        const exists = recipeItems.find(r => r.supply.id === selectedFromList.id);
        if (!exists) {
            setRecipeItems([...recipeItems, { supply: selectedFromList, quantityUsed: 1 }]);
        }

        setValue("");
        setSelectedFromList(null);
        setVisible(false);
    };

    const handleRemoveSupply = (id: number) => {
        setRecipeItems(recipeItems.filter(r => r.supply.id !== id));
    };

    const handleUpdateQuantity = (id: number, qty: string) => {
        const numQty = parseFloat(qty) || 0;
        if (numQty != 0) {
            setRecipeItems(recipeItems.map(r =>
                r.supply.id === id ? { ...r, quantityUsed: numQty } : r
            ));
        }
    };

    return (
        <>
            <div className="flex row gap-2 justify-center align-middle">
                <Command className="max-w-sm rounded-lg border">
                    <CommandInput
                        customIcon={<HamIcon />}
                        placeholder="Escriba un insumo..."
                        value={value}
                        onValueChange={(val) => {
                            setValue(val);
                            setVisible(true);
                            if (val == "") setVisible(false);
                        }}
                    />
                    <CommandList className={clsx(!visible && "hidden")}>
                        <CommandEmpty>Insumo no encontrado...</CommandEmpty>
                        <CommandGroup>
                            {supplyList.map((s) => (
                                <CommandItem
                                    key={s.id}
                                    onSelect={() => {
                                        setValue(s.name ?? "");
                                        setSelectedFromList(s);
                                        setVisible(false);
                                    }}
                                >
                                    <span>{s.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>

                <Button
                    type="button"
                    size="icon-sm"
                    aria-label="Submit"
                    className="cursor-pointer"
                    onClick={handleAddSupply}
                    disabled={!selectedFromList}
                >
                    <PlusIcon />
                </Button>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Insumo</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recipeItems.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                                No hay insumos seleccionados
                            </TableCell>
                        </TableRow>
                    ) : (
                        recipeItems.map((item) => (
                            <TableRow key={item.supply.id}>
                                <TableCell className="font-medium">{item.supply.name}</TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        className="h-8 w-20"
                                        value={item.quantityUsed}
                                        onChange={(e) => handleUpdateQuantity(item.supply.id ?? -1, e.target.value)}

                                    />
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="secondary">{item.supply.measureUnit || "U"}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        className="cursor-pointer text-destructive hover:bg-destructive/10"
                                        onClick={() => handleRemoveSupply(item.supply.id ?? -1)}
                                    >
                                        <MinusIcon className="h-3 w-3" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </>
    );
}

export function MenuManager({ products, supplies }: MenuProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = React.useState({});
    const [currentItem, setCurrentItem] = React.useState<any | null>(null);

    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
    const [alert, setAlert] = React.useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [errors, setErrors] = React.useState<Record<string, string[]>>({});

    const [formData, setFormData] = React.useState({
        name: "",
        price: 0,
        unitCost: 0,
        currentStock: 0,
        measureUnit: ""
    });

    const table = useReactTable({
        data: products,
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

    // Calculate base cost based on selected supplies
    const totalBaseCost = recipeItems.reduce((acc, item) => {
        return acc + ((item.supply.unitCost || 0) * item.quantityUsed);
    }, 0);

    React.useEffect(() => {
        if (currentItem) {
            setFormData({
                name: currentItem.name || "",
                price: Number(currentItem.price) || 0,
                unitCost: currentItem.unitCost || 0,
                currentStock: 0,
                measureUnit: ""
            });
            const existingRecipes = currentItem.recipes?.map((r: any) => ({
                supply: r.supplies,
                quantityUsed: Number(r.quantityUsed)
            })) || [];
            setRecipeItems(existingRecipes);
        } else {
            setFormData({
                name: "",
                price: 0,
                unitCost: 0,
                currentStock: 0,
                measureUnit: ""
            });
            setRecipeItems([]);
        }
    }, [currentItem]);



    const resetForm = () => {
        setCurrentItem(null);
        table.toggleAllRowsSelected(false);
        setFormData({ name: "", price: 0, unitCost: 0, currentStock: 0, measureUnit: "" });
        setRecipeItems([]);
        setAlert(null);
        setErrors({});
    };


    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === "unitCost" || name === "price") {
            const numericValue = parseFloat(value) || 0;
            const clampedValue = Math.max(totalBaseCost, numericValue);

            setFormData(prev => ({
                ...prev,
                [name]: clampedValue
            }));
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;


        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = async () => {
        setAlert(null);
        setErrors({});

        if (currentItem) {
            const response = await saveProduct({ id: currentItem.id, price: formData.price, name: formData.name });
            if (response.success) {
                resetForm();
                setAlert({ message: "Producto actualizado exitosamente.", type: 'success' });
                setTimeout(() => setAlert(null), 4000);
            } else {
                setAlert({ message: response.error || "Ocurrió un error.", type: 'error' });
                if (response.fieldErrors) {
                    setErrors(response.fieldErrors);
                }
            }
        } else {
            const response = await saveProduct({
                name: formData.name,
                price: formData.price,
                recipes: recipeItems.map(item => ({ supplyID: item.supply.id!, quantityUsed: item.quantityUsed }))
            });
            if (response.success) {
                resetForm();
                setAlert({ message: "Producto agregado exitosamente.", type: 'success' });
                setTimeout(() => setAlert(null), 4000);
            } else {
                setAlert({ message: response.error || "Ocurrió un error.", type: 'error' });
                if (response.fieldErrors) {
                    setErrors(response.fieldErrors);
                }
            }
        }
    };

    const isRowSelected = table.getSelectedRowModel().rows.length > 0;
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

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
                {alert && (
                    <div className={`p-3 rounded mb-4 text-sm font-semibold ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {alert.message}
                    </div>
                )}
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
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}

                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs font-semibold uppercase">Precio de venta</label>
                                
                                <Input name="unitCost" type="number" onBlur={handleInputBlur} value={formData.unitCost} onChange={handleInputChange} />
                                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price[0]}</p>}

                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase">Stock</label>
                                <Input name="currentStock" type="number" disabled value={formData.currentStock} />
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
                        <h2 className="text-xl font-bold">Agregar producto al menú</h2>
                        <p className="text-xs text-muted-foreground">Ingrese los datos del nuevo producto.</p>
                    </div>
                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="text-xs font-semibold uppercase">Nombre</label>
                            <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre del producto..." />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}

                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold uppercase">Insumos</label>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start font-normal">
                                        {recipeItems.length > 0
                                            ? `${recipeItems.length} insumos seleccionados`
                                            : "Editar lista insumos"}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle>Editar lista de insumos</DialogTitle>
                                    </DialogHeader>
                                    <ScrollArea className="max-h-[60vh]">
                                        <Popover open={open} onOpenChange={setOpen}>
                                            <PopoverAnchor asChild>
                                                <InputSupply
                                                    supplyList={supplies}
                                                    recipeItems={recipeItems}
                                                    setRecipeItems={setRecipeItems}
                                                />
                                            </PopoverAnchor>
                                        </Popover>
                                    </ScrollArea>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button className="cursor-pointer">Cerrar</Button>
                                        </DialogClose>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="flex flex-row items-center justify-between border-y py-2">
                            <label className="text-xs font-semibold uppercase">Costo base: </label>
                            <p className="font-mono font-bold">${totalBaseCost.toFixed(2)}</p>
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase">Precio de Venta</label>
                            <Input name="unitCost" type="number" value={formData.unitCost} onChange={handleInputChange} placeholder="0.00" />
                                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price[0]}</p>}
                        
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