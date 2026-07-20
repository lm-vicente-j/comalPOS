"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { saveProduct } from "@/lib/actions/products"
import { Supply } from "@/lib/actions/schemas"
import { PlusIcon, Edit2Icon } from "lucide-react"
import { InputSupply } from "./menu-manager"

type RecipeItem = {
    supply: Supply;
    quantityUsed: number | string;
};

function getBaseCost(product: any): number {
    const recipes = product.recipes || [];
    return recipes.reduce((acc: number, r: any) => {
        const unitCost = Number(r.supplies?.unitCost) || 0;
        const qty = Number(r.quantityUsed) || 0;
        return acc + (unitCost * qty);
    }, 0);
}

export function MobileMenuManager({ products, supplies }: { products: any[], supplies: Supply[] }) {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [currentItem, setCurrentItem] = React.useState<any | null>(null);
    const [search, setSearch] = React.useState("");
    const [recipeItems, setRecipeItems] = React.useState<RecipeItem[]>([]);
    const [errors, setErrors] = React.useState<Record<string, string[]>>({});
    const [alert, setAlert] = React.useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const [formData, setFormData] = React.useState({ name: "", price: "" });

    const totalBaseCost = recipeItems.reduce((acc, item) => {
        return acc + ((item.supply.unitCost || 0) * (Number(item.quantityUsed) || 0));
    }, 0);

    const openNew = () => {
        setCurrentItem(null);
        setFormData({ name: "", price: "" });
        setRecipeItems([]);
        setErrors({});
        setAlert(null);
        setIsDialogOpen(true);
    };

    const openEdit = (item: any) => {
        setCurrentItem(item);
        setFormData({
            name: item.name || "",
            price: item.price?.toString() ?? "",
        });
        setRecipeItems(item.recipes?.map((r: any) => ({
            supply: r.supplies,
            quantityUsed: Number(r.quantityUsed)
        })) || []);
        setErrors({});
        setAlert(null);
        setIsDialogOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setErrors({});
        setAlert(null);

        // Never allow a sale price below the recipe's base cost.
        if (!currentItem && Number(formData.price) < totalBaseCost) {
            setAlert({ message: "El precio de venta no puede ser menor al costo base.", type: 'error' });
            setErrors({ price: ["El precio de venta no puede ser menor al costo base."] });
            return;
        }

        const response = currentItem
            ? await saveProduct({ id: currentItem.id, name: formData.name, price: Number(formData.price) })
            : await saveProduct({
                name: formData.name,
                price: Number(formData.price),
                recipes: recipeItems.map(item => ({ supplyID: item.supply.id!, quantityUsed: Number(item.quantityUsed) || 0 }))
            });

        if (response.success) {
            setAlert({ message: "Guardado exitosamente.", type: 'success' });
            setTimeout(() => { setAlert(null); setIsDialogOpen(false); }, 1500);
        } else {
            setAlert({ message: response.error || "Ocurrió un error.", type: 'error' });
            if (response.fieldErrors) setErrors(response.fieldErrors);
        }
    };

    const filtered = products.filter(p =>
        (p.name || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col w-full h-full p-4 space-y-4 bg-gray-50">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold">Menú</h1>
                <Button onClick={openNew} size="sm"><PlusIcon className="w-4 h-4 mr-1" /> Agregar producto</Button>
            </div>

            <Input
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            {/* Lista móvil de productos */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                {filtered.map(item => {
                    const baseCost = getBaseCost(item);
                    const price = Number(item.price) || 0;
                    const profit = price - baseCost;
                    return (
                        <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-gray-800 truncate">{item.name}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-1.5">
                                    <span>Stock: <span className="font-mono text-gray-800">{item.stock ?? 0}</span></span>
                                    <span>Costo base: <span className="font-mono text-gray-800">${baseCost.toFixed(2)}</span></span>
                                    <span>Precio: <span className="font-mono text-gray-800">${price.toFixed(2)}</span></span>
                                    <span>Utilidad: <span className={`font-mono ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>${profit.toFixed(2)}</span></span>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openEdit(item)}>
                                <Edit2Icon className="w-4 h-4 text-gray-500" />
                            </Button>
                        </div>
                    );
                })}
                {filtered.length === 0 && (
                    <p className="text-sm text-center text-muted-foreground py-8">No hay productos.</p>
                )}
            </div>

            {/* Diálogo agregar / editar */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{currentItem ? "Editar producto" : "Agregar producto al menú"}</DialogTitle>
                    </DialogHeader>

                    {alert && (
                        <div className={`p-2 text-xs rounded font-semibold ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {alert.message}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase">Nombre</label>
                            <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre del producto..." />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                        </div>

                        {!currentItem && (
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold uppercase">Insumos</label>
                                <ScrollArea className="max-h-[40vh]">
                                    <InputSupply
                                        supplyList={supplies}
                                        recipeItems={recipeItems}
                                        setRecipeItems={setRecipeItems}
                                    />
                                </ScrollArea>
                            </div>
                        )}

                        <div className="flex flex-row items-center justify-between border-y py-2">
                            <label className="text-xs font-semibold uppercase">Costo base:</label>
                            <p className="font-mono font-bold">${totalBaseCost.toFixed(2)}</p>
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase">Precio de venta</label>
                            <Input name="price" type="number" value={formData.price} onChange={handleInputChange} placeholder="0.00" />
                            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price[0]}</p>}
                        </div>

                        <Button className="w-full mt-2" onClick={handleSave}>
                            {currentItem ? "Actualizar" : "Agregar"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
