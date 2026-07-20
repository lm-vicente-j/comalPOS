"use client";

import { useState, ChangeEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Field,
    FieldContent,
    FieldLabel,
} from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Customer } from "@/lib/actions/schemas";
import { saveCustomer } from "@/lib/actions/customers";
import { saveUser } from "@/lib/actions/users";
import { PlusIcon, Edit2Icon } from "lucide-react";
import { PasswordField } from "./crm-manager";

export default function MobileCRMManager({ customers, staff }: { customers: Customer[], staff: User[] }) {
    const [listEditing, setListEditing] = useState<"CUSTOMERS" | "STAFF">("CUSTOMERS");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [pin, setPin] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [staffSearch, setStaffSearch] = useState("");

    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [alert, setAlert] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        customerName: "",
        phone: "",
        role: "",
        active: true,
        password: "",
        pin: "",
    });

    const resetForm = () => {
        setCurrentItem(null);
        setFormData({ name: "", customerName: "", phone: "", role: "", active: true, password: "", pin: "" });
        setPin("");
        setErrors({});
        setAlert(null);
    };

    const openNew = () => {
        resetForm();
        setIsDialogOpen(true);
    };

    const openEdit = (item: any) => {
        setCurrentItem(item);
        // Credentials are never loaded into the form; blank means "keep the current one".
        setFormData({
            name: item.name || "",
            customerName: item.customerName || "",
            phone: item.phone || "",
            role: item.role || "",
            active: item.active ?? true,
            password: "",
            pin: "",
        });
        setPin("");
        setErrors({});
        setAlert(null);
        setIsDialogOpen(true);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const stringFields = ["name", "customerName", "phone", "password", "pin"];
        setFormData(prev => ({
            ...prev,
            [name]: stringFields.includes(name) ? value : parseFloat(value) || 0,
        }));
    };

    const handleSave = async () => {
        setErrors({});
        setAlert(null);
        let response;
        if (listEditing === "CUSTOMERS") {
            response = await saveCustomer({
                id: currentItem?.id,
                customerName: formData.customerName || formData.name,
                phone: formData.phone,
            });
        } else {
            // Send null when the credential was left blank so the server keeps the stored one.
            response = await saveUser({
                id: currentItem?.id,
                name: formData.name,
                role: formData.role,
                active: formData.active,
                password: formData.role === "STAFF" ? null : (formData.password || null),
                pin: formData.role === "STAFF" ? (pin || null) : null,
            });
        }

        if (response?.success) {
            setAlert({ message: "Guardado exitosamente.", type: 'success' });
            setTimeout(() => { setAlert(null); setIsDialogOpen(false); resetForm(); }, 1500);
        } else {
            setAlert({ message: response?.error || "Error al guardar.", type: 'error' });
            if (response?.fieldErrors) setErrors(response.fieldErrors);
        }
    };

    const passwordFieldProps = {
        role: formData.role,
        pin,
        setPin,
        formData,
        setFormData,
        handleInputChange,
        errors,
        hasCredential: currentItem
            ? (formData.role === "STAFF" ? !!currentItem.hasPin : !!currentItem.hasPassword)
            : false,
    };

    const filteredCustomers = customers.filter(c =>
        (c.customerName || "").toLowerCase().includes(customerSearch.toLowerCase())
    );
    const filteredStaff = staff.filter(s =>
        (s.name || "").toLowerCase().includes(staffSearch.toLowerCase())
    );

    return (
        <div className="flex flex-col w-full h-full p-4 space-y-4 bg-gray-50">
            <h1 className="text-xl font-bold">CRM</h1>

            <Tabs defaultValue="customers" className="w-full flex-1 min-h-0 flex flex-col">
                <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger onClick={() => { setListEditing("CUSTOMERS"); resetForm(); }} className="cursor-pointer" value="customers">Clientes</TabsTrigger>
                    <TabsTrigger onClick={() => { setListEditing("STAFF"); resetForm(); }} className="cursor-pointer" value="staff">Empleados</TabsTrigger>
                </TabsList>

                <TabsContent value="customers" className="flex flex-col min-h-0 space-y-3">
                    <div className="flex gap-2 items-center pt-2">
                        <Input
                            placeholder="Buscar cliente..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                        />
                        <Button onClick={openNew} size="sm" className="shrink-0">
                            <PlusIcon className="w-4 h-4 mr-1" /> Nuevo
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                        {filteredCustomers.map(item => {
                            const balance = parseFloat(String(item.currentBalance ?? "0"));
                            return (
                                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-gray-800 truncate">{item.customerName}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-1">
                                            <span>Tel: {item.phone || "---"}</span>
                                            <span>
                                                Saldo: <span className={`font-mono ${balance > 0 ? "text-red-500" : "text-green-600"}`}>${balance.toFixed(2)}</span>
                                            </span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openEdit(item)}>
                                        <Edit2Icon className="w-4 h-4 text-gray-500" />
                                    </Button>
                                </div>
                            );
                        })}
                        {filteredCustomers.length === 0 && (
                            <p className="text-sm text-center text-muted-foreground py-8">No hay clientes.</p>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="staff" className="flex flex-col min-h-0 space-y-3">
                    <div className="flex gap-2 items-center pt-2">
                        <Input
                            placeholder="Buscar empleado..."
                            value={staffSearch}
                            onChange={(e) => setStaffSearch(e.target.value)}
                        />
                        <Button onClick={openNew} size="sm" className="shrink-0">
                            <PlusIcon className="w-4 h-4 mr-1" /> Nuevo
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                        {filteredStaff.map(item => (
                            <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center gap-2">
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-gray-800 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                        {item.username}{item.email ? ` - ${item.email}` : ""}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        <Badge variant="secondary">{item.role}</Badge>
                                        <Badge variant={item.active ? "outline" : "destructive"} className={item.active ? "border-green-600 text-green-600" : ""}>
                                            {item.active ? "Activo" : "Inactivo"}
                                        </Badge>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => openEdit(item)}>
                                    <Edit2Icon className="w-4 h-4 text-gray-500" />
                                </Button>
                            </div>
                        ))}
                        {filteredStaff.length === 0 && (
                            <p className="text-sm text-center text-muted-foreground py-8">No hay empleados.</p>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Diálogo agregar / editar */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {listEditing === "CUSTOMERS"
                                ? (currentItem ? "Editar Cliente" : "Registrar Nuevo Cliente")
                                : (currentItem ? "Editar Empleado" : "Registrar Nuevo Empleado")}
                        </DialogTitle>
                    </DialogHeader>

                    {alert && (
                        <div className={`p-2 text-xs rounded font-semibold ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {alert.message}
                        </div>
                    )}

                    {listEditing === "CUSTOMERS" ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold uppercase">Nombre</label>
                                <Input name="customerName" value={formData.customerName} onChange={handleInputChange} placeholder="Nombre Completo" />
                                {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName[0]}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase">Teléfono (opcional)</label>
                                <Input name="phone" type="text" value={formData.phone} onChange={handleInputChange} placeholder="XXXX-XXXX-XX" />
                                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone[0]}</p>}
                            </div>
                            <Button className="w-full mt-2" onClick={handleSave}>
                                {currentItem ? "Actualizar" : "Registrar"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold uppercase">Nombre</label>
                                <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre Completo" />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase">Rol</label>
                                <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Seleccionar Rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STAFF">Staff</SelectItem>
                                        <SelectItem value="ADMIN">Administrador</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role[0]}</p>}
                            </div>
                            {currentItem && (
                                <div>
                                    <label className="text-xs font-semibold uppercase">Activo</label>
                                    <Field orientation="horizontal">
                                        <Checkbox
                                            name="active"
                                            checked={formData.active}
                                            onCheckedChange={(value) =>
                                                setFormData(prev => ({ ...prev, active: !!value }))
                                            }
                                        />
                                        <FieldContent>
                                            <FieldLabel>Usuario habilitado en sistema</FieldLabel>
                                        </FieldContent>
                                    </Field>
                                </div>
                            )}
                            <PasswordField {...passwordFieldProps} />
                            <Button className="w-full mt-2" onClick={handleSave}>
                                {currentItem ? "Actualizar" : "Registrar"}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
