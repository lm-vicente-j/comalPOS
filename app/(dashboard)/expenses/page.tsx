"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { saveExpense, getExpenses } from "@/lib/actions/expenses";

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form States
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState<Date>(new Date());

    const fetchData = async () => {
        const data = await getExpenses();
        setExpenses(data);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async () => {
        if (!amount || !category) return alert("Complete los campos obligatorios");

        setLoading(true);
        const res = await saveExpense({
            amount: parseFloat(amount),
            category,
            description,
            date: date || new Date(),
            registered_by: 1, // You should get this from your auth session
        });

        if (res.success) {
            setAmount("");
            setDescription("");
            setCategory("");
            fetchData();
        }
        setLoading(false);
    };

    const totalMonth = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);

    return (
        <div className="flex flex-col items-center justify-around w-full h-full p-6 gap-6">
            <div className="grid grid-cols-2 gap-4 w-full max-w-6xl">
                <div className="outline rounded-md p-6 bg-white flex flex-col items-center justify-center">
                    <p className="text-muted-foreground text-sm">Gastos Totales Registrados</p>
                    <p className="text-3xl font-bold text-red-600">${totalMonth.toFixed(2)}</p>
                </div>
                <div className="outline rounded-md p-6 bg-white flex flex-col items-center justify-center">
                    <p className="text-muted-foreground text-sm">Último Gasto</p>
                    <p className="text-2xl font-bold">{expenses[0]?.category || "N/A"}</p>
                </div>
            </div>

            <div className="flex flex-row w-full max-w-6xl h-150 rounded-md border p-6 bg-white gap-6">
                <div className="flex flex-col gap-5 w-1/2">
                    <h2 className="text-lg font-bold">Registrar Nuevo Gasto</h2>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <Label>Monto</Label>
                            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Categoría</Label>
                            <Select onValueChange={setCategory} value={category}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Insumos">Insumos</SelectItem>
                                    <SelectItem value="Servicios">Servicios (Luz/Agua)</SelectItem>
                                    <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                                    <SelectItem value="Otros">Otros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Descripción</Label>
                            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalle del gasto..." />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label>Fecha</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "PPP") : <span>Seleccionar fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={loading} className="mt-4">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Gasto
                    </Button>
                </div>

                <Separator orientation="vertical" />

                <div className="w-1/2 flex flex-col">
                    <h2 className="text-lg font-bold mb-4">Historial de Gastos</h2>
                    <ScrollArea className="flex-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Categoría</TableHead>
                                    <TableHead className="text-right">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="text-xs">
                                            {expense.date ? format(new Date(expense.date), "dd/MM/yy") : "---"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{expense.description}</span>
                                                <span className="text-[10px] text-muted-foreground">{expense.category}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-red-600">
                                            ${Number(expense.amount).toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}