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
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
    Field,
    FieldContent,
    FieldLabel,
} from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@/lib/actions/schemas";
import { saveCustomer } from "@/lib/actions/customers";
import { Customer } from "@/lib/actions/schemas";
import { saveUser } from "@/lib/actions/users";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";


export const staffColumns: ColumnDef<User>[] = [
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
            return <div className="font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: "currentBalance",
        header: () => <div className="text-right">Saldo</div>,
        cell: ({ row }) => {
            const balance = parseFloat(row.getValue("currentBalance") || "0");
            return (
                <div className={`text-right font-mono ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                    ${balance.toFixed(2)}
                </div>
            );
        },
    },
]


// ✅ Movido fuera de CRMManager para evitar remount en cada render
function PasswordField({
    role,
    pin,
    setPin,
    formData,
    setFormData,
    handleInputChange,
    errors,
}: {
    role: string;
    pin: string;
    setPin: (v: string) => void;
    formData: any;
    setFormData: (fn: (prev: any) => any) => void;
    handleInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
    errors: Record<string, string[]>;
}) {
    return (
        <div>
            <label className="text-xs font-semibold uppercase">Contraseña</label>
            {role === "STAFF" ? (
                <>
                    <input type="hidden" name="pin" value={pin} />
                    <InputOTP maxLength={4} value={pin} onChange={(v) => {
                        setPin(v);
                        setFormData(prev => ({ ...prev, pin: v }));
                    }}>
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                        </InputOTPGroup>
                    </InputOTP>
                    {errors.pin && <p className="text-red-500 text-xs mt-1">{errors.pin[0]}</p>}
                </>
            ) : (
                <>
                    <Input name="password" type="password" value={formData.password} onChange={handleInputChange} placeholder="Contraseña..." />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password[0]}</p>}
                </>
            )}
        </div>
    );
}


export default function CRMManager({ customers, staff }: { customers: Customer[], staff: User[] }) {

    const [pin, setPin] = useState("");
    const [listEditing, setListEditing] = useState<"CUSTOMERS" | "STAFF">("CUSTOMERS");

    const [customerSorting, setCustomerSorting] = useState<SortingState>([]);
    const [customerFilters, setCustomerFilters] = useState<ColumnFiltersState>([]);
    const [staffSorting, setStaffSorting] = useState<SortingState>([]);
    const [staffFilters, setStaffFilters] = useState<ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = useState({});

    const [currentItem, setCurrentItem] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: "",
        customerName: "",
        phone: "",
        role: "",
        active: true,
        password: "",
        pin: "",
    });

    const customerTable = useReactTable({
        data: customers,
        columns: customerColumns,
        onSortingChange: setCustomerSorting,
        onColumnFiltersChange: setCustomerFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        enableMultiRowSelection: false,
        state: { sorting: customerSorting, columnFilters: customerFilters, rowSelection },
    });

    const staffTable = useReactTable({
        data: staff,
        columns: staffColumns,
        onSortingChange: setStaffSorting,
        onColumnFiltersChange: setStaffFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onRowSelectionChange: setRowSelection,
        enableMultiRowSelection: false,
        state: { sorting: staffSorting, columnFilters: staffFilters, rowSelection },
    });

    useEffect(() => {
        setPin("");

        if (currentItem) {
            setFormData({
                name: currentItem.name || "",
                customerName: currentItem.customerName || "",
                phone: currentItem.phone || "",
                role: currentItem.role || "",
                active: currentItem.active ?? true,
                password: currentItem.password || "",
                pin: currentItem.pin || "",
            });
            setPin(currentItem.pin || "");
        } else {
            setFormData({ name: "", customerName: "", phone: "", role: "", active: true, password: "", pin: "" });
        }
    }, [currentItem]);

    const resetForm = () => {
        setCurrentItem(null);
        customerTable.toggleAllRowsSelected(false);
        staffTable.toggleAllRowsSelected(false);
        setFormData({ name: "", customerName: "", phone: "", role: "", active: true, password: "", pin: "" });
        setPin("");
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const stringFields = ["name", "customerName", "phone", "password", "pin"];
        setFormData(prev => ({
            ...prev,
            [name]: stringFields.includes(name) ? value : parseFloat(value) || 0,
        }));
    };

    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [alert, setAlert] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const handleSave = async () => {
        setErrors({});
        setAlert(null);
        let response;
        if (listEditing === "CUSTOMERS") {
            response = await saveCustomer({
                id: currentItem?.id,
                customerName: formData.name || formData.customerName,
                phone: formData.phone,
            });
        } else {
            response = await saveUser({
                id: currentItem?.id,
                name: formData.name,
                role: formData.role,
                active: formData.active,
                password: formData.role === "STAFF" ? null : formData.password,
                pin: formData.role === "STAFF" ? pin : null,
            });
        }

        if (response?.success) {
            resetForm();
            setAlert({ message: "Guardado exitosamente.", type: 'success' });
            setTimeout(() => setAlert(null), 4000);
        } else {
            setAlert({ message: response?.error || "Error al guardar.", type: 'error' });
            if (response?.fieldErrors) {
                setErrors(response.fieldErrors);
            }
        }
    };

    const isRowSelected = (listEditing === "CUSTOMERS" ? customerTable : staffTable)
        .getSelectedRowModel().rows.length > 0;

    // Props compartidas para PasswordField
    const passwordFieldProps = {
        role: formData.role,
        pin,
        setPin,
        formData,
        setFormData,
        handleInputChange,
        errors,
    };

    return (
        <div className="flex flex-row items-center justify-around w-full h-full gap-4 p-4">
            <div className="bg-white flex flex-col w-[70%] h-[90%] border rounded-md p-5 shadow-sm">
                <Tabs defaultValue="customers" className="w-100%">
                    <TabsList>
                        <TabsTrigger onClick={() => { setListEditing("CUSTOMERS"); resetForm(); }} className="cursor-pointer" value="customers">Clientes</TabsTrigger>
                        <TabsTrigger onClick={() => { setListEditing("STAFF"); resetForm(); }} className="cursor-pointer" value="STAFF">Empleados</TabsTrigger>
                    </TabsList>
                    <TabsContent value="customers">
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
                    <TabsContent value="STAFF">
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
                {alert && (
                    <div className={`p-3 rounded mb-4 text-sm font-semibold ${alert.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {alert.message}
                    </div>
                )}

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
                                    <Input name="customerName" value={formData.customerName} onChange={handleInputChange} />
                                    {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName[0]}</p>}
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase">Teléfono</label>
                                    <Input name="phone" type="text" value={formData.phone} onChange={handleInputChange} />
                                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone[0]}</p>}
                                </div>
                            </div>
                            <ButtonGroup className="mt-6 flex gap-2 w-full">
                                <Button type="button" variant="outline" onClick={resetForm} className="flex-1 cursor-pointer">Cancelar</Button>
                                <Button type="button" onClick={handleSave} className="rounded-sm cursor-pointer">Actualizar</Button>
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
                                    {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName[0]}</p>}
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase">Teléfono</label>
                                    <Input name="phone" type="text" value={formData.phone} onChange={handleInputChange} placeholder="XXXX-XXXX-XX" />
                                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone[0]}</p>}
                                </div>
                            </div>
                            <ButtonGroup className="mt-6 flex gap-2 w-full">
                                <Button type="button" variant="outline" onClick={resetForm} className="cursor-pointer flex-1 rounded-sm">Limpiar</Button>
                                <Button type="button" onClick={handleSave} className="rounded-sm cursor-pointer">Registrar Nuevo Cliente</Button>
                            </ButtonGroup>
                        </form>
                    </>
                )}

                {listEditing === "STAFF" && (
                    <>
                        <form hidden={!isRowSelected} className="h-full w-full flex-col flex flex-1 justify-between">
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-row items-center justify-between">
                                    <h2 className="text-xl font-bold">Editar usuario</h2>
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
                                <div>
                                    <label className="text-xs font-semibold uppercase">Rol</label>
                                    <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                                        <SelectTrigger className="w-45">
                                            <SelectValue placeholder="Seleccionar Rol" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="STAFF">Staff</SelectItem>
                                            <SelectItem value="ADMIN">Administrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role[0]}</p>}
                                </div>
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
                                <PasswordField {...passwordFieldProps} />
                            </div>
                            <ButtonGroup className="mt-6 flex gap-2 w-full">
                                <Button type="button" variant="outline" onClick={resetForm} className="flex-1 cursor-pointer">Cancelar</Button>
                                <Button type="button" onClick={handleSave} className="rounded-sm cursor-pointer">Actualizar</Button>
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
                                    <Input name="name" value={formData.name} onChange={handleInputChange} placeholder="Nombre Completo" />
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase">Rol</label>
                                    <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                                        <SelectTrigger className="w-45">
                                            <SelectValue placeholder="Seleccionar Rol" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="STAFF">Staff</SelectItem>
                                            <SelectItem value="ADMIN">Administrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role[0]}</p>}
                                </div>
                                <PasswordField {...passwordFieldProps} />
                            </div>
                            <ButtonGroup className="mt-6 flex gap-2 w-full">
                                <Button type="button" variant="outline" onClick={resetForm} className="cursor-pointer flex-1 rounded-sm">Limpiar</Button>
                                <Button type="button" onClick={handleSave} className="rounded-sm cursor-pointer">Registrar Nuevo Empleado</Button>
                            </ButtonGroup>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}