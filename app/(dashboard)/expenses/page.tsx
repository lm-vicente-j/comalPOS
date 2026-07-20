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
import { InfiniteScroll } from "@/components/ui/infinite-scroll";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

import { saveExpense, getExpenses } from "@/lib/actions/expenses";
import { hasOpenJornada } from "@/lib/actions/jornada";
import { usePolling } from "@/lib/use-polling";

const PAGE_SIZE = 30;

type ExpenseRow = Awaited<ReturnType<typeof getExpenses>>["items"][number];

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [jornadaOpen, setJornadaOpen] = useState(true);

    // Form States
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState<Date>(new Date());

    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [alert, setAlert] = useState<{ message: string; type: "success" | "error" } | null>(null);

    // Reloads the first page (used on mount and after saving an expense).
    const fetchData = async () => {
        const res = await getExpenses(0, PAGE_SIZE);
        setExpenses(res.items);
        setTotal(res.total);
        setHasMore(res.hasMore);
    };

    const loadMore = async () => {
        setLoadingMore(true);
        const res = await getExpenses(expenses.length, PAGE_SIZE);
        setExpenses((prev) => [...prev, ...res.items]);
        setTotal(res.total);
        setHasMore(res.hasMore);
        setLoadingMore(false);
    };

    useEffect(() => {
        fetchData();
        // New expenses need an open jornada; the history stays available regardless.
        hasOpenJornada().then(setJornadaOpen);
    }, []);

    // Keep the list and the jornada gate in sync with the other open sessions.
    // Refetches the window already on screen so infinite scroll is preserved.
    usePolling(() => {
        getExpenses(0, Math.max(PAGE_SIZE, expenses.length)).then((res) => {
            setExpenses(res.items);
            setTotal(res.total);
            setHasMore(res.hasMore);
        });
        hasOpenJornada().then(setJornadaOpen);
    });

    const resetForm = () => {
        setAmount("");
        setDescription("");
        setCategory("");
        setDate(new Date());
        setErrors({});
    };

    const handleSave = async () => {
        setErrors({});
        setAlert(null);

        const localErrors: Record<string, string[]> = {};
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
            localErrors.amount = ["Ingrese un monto válido mayor a 0."];
        if (!category)
            localErrors.category = ["Seleccione una categoría."];

        if (Object.keys(localErrors).length > 0) {
            setErrors(localErrors);
            setAlert({ message: "Corrija los campos marcados.", type: "error" });
            return;
        }

        setLoading(true);
        // registered_by ya no viaja desde el cliente: el servidor lo toma de la sesión.
        const res = await saveExpense({
            amount: parseFloat(amount),
            category,
            description,
            date: date || new Date(),
        });

        if (res.success) {
            resetForm();
            setDialogOpen(false);
            setAlert({ message: "Gasto guardado exitosamente.", type: "success" });
            setTimeout(() => setAlert(null), 4000);
            fetchData();
        } else {
            setAlert({ message: res.error || "Error al guardar el gasto.", type: "error" });
            if (res.fieldErrors) {
                setErrors(res.fieldErrors);
            }
        }

        setLoading(false);
    };

    return (
        <div className="flex h-full w-full flex-col items-center justify-start gap-3 p-3 lg:gap-6 lg:p-6">

            {/* Compact summary cards: min-w-0 + truncate keep long amounts
                inside their container on narrow screens. */}
            <div className="grid w-full max-w-6xl shrink-0 grid-cols-2 gap-2 lg:gap-4">
                <div className="flex min-w-0 flex-col items-center justify-center rounded-md border bg-white p-3 lg:p-5">
                    <p className="w-full truncate text-center text-xs text-muted-foreground lg:text-sm">Gastos Totales Registrados</p>
                    <p className="w-full truncate text-center text-lg font-bold text-red-600 lg:text-2xl">${total.toFixed(2)}</p>
                </div>
                <div className="flex min-w-0 flex-col items-center justify-center rounded-md border bg-white p-3 lg:p-5">
                    <p className="w-full truncate text-center text-xs text-muted-foreground lg:text-sm">Último Gasto</p>
                    <p className="w-full truncate text-center text-lg font-bold lg:text-2xl">{expenses[0]?.category ?? "---"}</p>
                </div>
            </div>

            {/* Full-width history with the add dialog opened from the top button */}
            <div className="flex min-h-0 w-full max-w-6xl flex-1 flex-col rounded-md border bg-white p-3 lg:p-6">

                {alert && (
                    <div className={`mb-3 w-full shrink-0 rounded p-3 text-sm font-semibold ${alert.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {alert.message}
                    </div>
                )}

                <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                    <h2 className="truncate text-base font-bold lg:text-lg">Historial de Gastos</h2>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="cursor-pointer shrink-0" size="sm" disabled={!jornadaOpen}>
                                <Plus className="h-4 w-4" />
                                Nuevo gasto
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
                            </DialogHeader>

                            {alert?.type === "error" && (
                                <div className="w-full rounded bg-red-100 p-3 text-sm font-semibold text-red-700">
                                    {alert.message}
                                </div>
                            )}

                            <div className="space-y-3">
                                <div className="flex flex-col gap-2">
                                    <Label>Monto</Label>
                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className={errors.amount ? "border-red-500 focus-visible:ring-red-500" : ""}
                                    />
                                    <p className="h-4 text-xs text-red-500">{errors.amount ? errors.amount[0] : ""}</p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label>Categoría</Label>
                                    <Select onValueChange={setCategory} value={category}>
                                        <SelectTrigger
                                            className={errors.category ? "border-red-500 focus-visible:ring-red-500" : ""}
                                        >
                                            <SelectValue placeholder="Seleccionar categoría" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Insumos">Insumos</SelectItem>
                                            <SelectItem value="Servicios">Servicios (Luz/Agua)</SelectItem>
                                            <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                                            <SelectItem value="Otros">Otros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="h-4 text-xs text-red-500">{errors.category ? errors.category[0] : ""}</p>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label>Descripción</Label>
                                    <Input
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Detalle del gasto..."
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <Label>Fecha</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "justify-start text-left font-normal",
                                                    !date && "text-muted-foreground",
                                                    errors.date && "border-red-500"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {date ? format(date, "PPP") : <span>Seleccionar fecha</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar
                                                mode="single"
                                                selected={date}
                                                onSelect={(d) => d && setDate(d)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <p className="h-4 text-xs text-red-500">{errors.date ? errors.date[0] : ""}</p>
                                </div>
                            </div>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button className="cursor-pointer" variant="outline" disabled={loading}>Cancelar</Button>
                                </DialogClose>
                                <Button className="cursor-pointer" onClick={handleSave} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar Gasto
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <ScrollArea className="min-h-0 flex-1 pr-2 lg:pr-4">
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
                                        <div className="flex min-w-0 flex-col">
                                            <span className="font-medium break-words">{expense.description}</span>
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
                    <InfiniteScroll onLoadMore={loadMore} hasMore={hasMore} loading={loadingMore} />
                </ScrollArea>
            </div>
        </div>
    );
}
