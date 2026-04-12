"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { saveSupply } from "@/lib/actions/inventory"
import { type Supply } from "@/lib/actions/schemas"
import { PlusIcon, Edit2Icon } from "lucide-react"

const measureUnits = [
    { value: "kg", label: "KILOG" },
    { value: "Lt", label: "LITRO" },
    { value: "piece", label: "PAQU./PIEZA" },
]

export function MobileInventoryManager({ data }: { data: Supply[] }) {
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [currentItem, setCurrentItem] = React.useState<Supply | null>(null);
    const [errors, setErrors] = React.useState<Record<string, string[]>>({});
    const [alert, setAlert] = React.useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const [formData, setFormData] = React.useState({
        name: "", unitCost: 0, currentStock: 0, measureUnit: ""
    });

    const openEdit = (item: Supply) => {
        setCurrentItem(item);
        setFormData({
            name: item.name || "",
            unitCost: item.unitCost || 0,
            currentStock: item.currentStock || 0,
            measureUnit: item.measureUnit || ""
        });
        setErrors({});
        setIsDialogOpen(true);
    };

    const openNew = () => {
        setCurrentItem(null);
        setFormData({ name: "", unitCost: 0, currentStock: 0, measureUnit: "" });
        setErrors({});
        setIsDialogOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === "name" || name === "measureUnit" ? value : parseFloat(value) || 0
        }));
    };

    const handleSave = async () => {
        setErrors({});
        setAlert(null);
        const response = await saveSupply({ ...formData, id: currentItem?.id } as any);

        if (response.success) {
            setAlert({ message: "Guardado exitosamente.", type: 'success' });
            setTimeout(() => { setAlert(null); setIsDialogOpen(false); }, 1500);
        } else {
            setAlert({ message: response.error || "Ocurrió un error.", type: 'error' });
            if (response.fieldErrors) setErrors(response.fieldErrors);
        }
    };

    return (
        <div className="flex flex-col w-full h-full p-4 space-y-4 bg-gray-50">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold">Inventario</h1>
                <Button onClick={openNew} size="sm"><PlusIcon className="w-4 h-4 mr-1" /> Nuevo</Button>
            </div>

            {/* Mobile List View */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                {data.map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
                        <div>
                            <p className="font-bold text-gray-800">{item.name}</p>
                            <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                <Badge variant="secondary">{item.currentStock} {item.measureUnit}</Badge>
                                <span>${Number(item.unitCost).toFixed(2)}</span>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                            <Edit2Icon className="w-4 h-4 text-gray-500" />
                        </Button>
                    </div>
                ))}
            </div>

            {/* Form Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="w-[95%] rounded-lg sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{currentItem ? "Editar Insumo" : "Agregar Insumo"}</DialogTitle>
                    </DialogHeader>
                    
                    {alert && (
                        <div className={`p-2 text-xs rounded font-semibold ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {alert.message}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase">Nombre</label>
                            <Input name="name" value={formData.name} onChange={handleInputChange} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-xs font-semibold uppercase">Stock</label>
                                <Input type="number" name="currentStock" value={formData.currentStock} onChange={handleInputChange} />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-semibold uppercase">Costo ($)</label>
                                <Input type="number" name="unitCost" value={formData.unitCost} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase">Unidad</label>
                            <select 
                                name="measureUnit" 
                                value={formData.measureUnit} 
                                onChange={handleInputChange}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                            >
                                <option value="" disabled>Seleccionar...</option>
                                {measureUnits.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                            </select>
                            {errors.measureUnit && <p className="text-red-500 text-xs mt-1">{errors.measureUnit[0]}</p>}
                        </div>
                        <Button className="w-full mt-4" onClick={handleSave}>Guardar Insumo</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}