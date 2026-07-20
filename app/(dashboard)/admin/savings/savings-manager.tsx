"use client"
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveMovement, saveGoal, addContribution, cancelGoal, getRecentMovements } from "@/lib/actions/savings";
import { InfiniteScroll } from "@/components/ui/infinite-scroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Plus, ArrowDownLeft, ArrowUpRight, Target, CheckCircle2, XCircle, PiggyBank } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
    pool: { balance: number; deposited: number; withdrawn: number };
    movements: Awaited<ReturnType<typeof import("@/lib/actions/savings").getRecentMovements>>;
    goals: Awaited<ReturnType<typeof import("@/lib/actions/savings").getGoalsWithProgress>>;
    jornadaOpen: boolean;
};

export default function SavingsManager({ pool, movements, goals, jornadaOpen }: Props) {
    return (
        <Tabs defaultValue="pool" className="w-full gap-4">
            <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
                <TabsTrigger value="pool" className="cursor-pointer">
                    <PiggyBank className="h-4 w-4" /> Alcancía
                </TabsTrigger>
                <TabsTrigger value="goals" className="cursor-pointer">
                    <Target className="h-4 w-4" /> Metas
                </TabsTrigger>
            </TabsList>
            <TabsContent value="pool">
                <PoolCard pool={pool} movements={movements} jornadaOpen={jornadaOpen} />
            </TabsContent>
            <TabsContent value="goals">
                <GoalsSection goals={goals} />
            </TabsContent>
        </Tabs>
    );
}

function PoolCard({ pool, movements, jornadaOpen }: { pool: Props["pool"]; movements: Props["movements"]; jornadaOpen: boolean }) {
    const [items, setItems] = useState(movements.items);
    const [hasMore, setHasMore] = useState(movements.hasMore);
    const [loadingMore, setLoadingMore] = useState(false);

    const itemsRef = useRef(items);
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);

    // The server re-sends the first page after every router.refresh(); resync,
    // but skip the reset when that page is already a prefix of what's on
    // screen so the periodic AutoRefresh doesn't collapse the infinite scroll.
    useEffect(() => {
        const current = itemsRef.current;
        const isPrefix = movements.items.length > 0 &&
            movements.items.length <= current.length &&
            movements.items.every((m, i) => current[i]?.id === m.id);
        if (isPrefix) return;
        setItems(movements.items);
        setHasMore(movements.hasMore);
    }, [movements]);

    const loadMore = async () => {
        setLoadingMore(true);
        const res = await getRecentMovements(20, items.length);
        setItems(prev => [...prev, ...res.items]);
        setHasMore(res.hasMore);
        setLoadingMore(false);
    };

    return (
        <Card className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-700">Alcancia</h2>
                    <p className="text-3xl font-bold text-emerald-700 mt-1">${pool.balance.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Depositado total: ${pool.deposited.toFixed(2)} · Retirado total: ${pool.withdrawn.toFixed(2)}
                    </p>
                </div>
                <MovementDialog jornadaOpen={jornadaOpen} />
            </div>

            <h3 className="text-sm font-medium text-gray-700 mt-6 mb-2">Movimientos recientes</h3>
            {items.length === 0 ? (
                <p className="text-sm text-gray-500">Aún no hay movimientos registrados.</p>
            ) : (
                <div className="divide-y">
                    {items.map(m => (
                        <div key={m.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                            <div className="flex items-center gap-2.5 min-w-0">
                                {m.type === "DEPOSIT"
                                    ? <ArrowDownLeft className="h-4 w-4 text-emerald-600 shrink-0" />
                                    : <ArrowUpRight className="h-4 w-4 text-red-600 shrink-0" />}
                                <div className="min-w-0">
                                    <p className="font-medium break-words">{m.description || (m.type === "DEPOSIT" ? "Depósito" : "Retiro")}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(m.createdAt).toLocaleString("es-MX")} · {m.userName}
                                    </p>
                                </div>
                            </div>
                            <span className={`font-semibold shrink-0 ${m.type === "DEPOSIT" ? "text-emerald-700" : "text-red-700"}`}>
                                {m.type === "DEPOSIT" ? "+" : "−"}${m.amount.toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            <InfiniteScroll onLoadMore={loadMore} hasMore={hasMore} loading={loadingMore} />
        </Card>
    );
}

function MovementDialog({ jornadaOpen }: { jornadaOpen: boolean }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setError(null);
        const parsed = Number(amount);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            setError("Monto inválido");
            return;
        }
        setLoading(true);
        const res = await saveMovement(parsed, type, description.trim() || undefined);
        setLoading(false);

        if (res.success) {
            setOpen(false);
            setAmount("");
            setDescription("");
            setType("DEPOSIT");
            router.refresh();
        } else {
            setError(
                res.message === "NO_OPEN_JORNADA"
                    ? "Necesitas abrir una jornada antes de registrar movimientos."
                    : res.message
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {/* Movements post against the open jornada, so the button locks without one. */}
                <Button className="w-full sm:w-auto shrink-0" disabled={!jornadaOpen}>
                    <Plus className="h-4 w-4 mr-1" /> Registrar movimiento
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registrar movimiento</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <Label>Tipo</Label>
                        <Select value={type} onValueChange={v => setType(v as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DEPOSIT">Depósito (entra a la alcancia, sale de caja)</SelectItem>
                                <SelectItem value="WITHDRAW">Retiro (sale de la alcancia, entra a caja)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="amt">Monto</Label>
                        <Input id="amt" type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                        <Label htmlFor="desc">Descripción (opcional)</Label>
                        <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: ahorro del viernes" />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={loading}>Cancelar</Button></DialogClose>
                    <Button onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GoalsSection({ goals }: { goals: Props["goals"] }) {
    const active = goals.filter(g => g.status === "ACTIVE");
    const completed = goals.filter(g => g.status === "COMPLETED");
    const cancelled = goals.filter(g => g.status === "CANCELLED");

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h2 className="text-lg font-semibold">Metas</h2>
                <GoalDialog />
            </div>

            {active.length === 0 ? (
                <Card className="p-6 text-center text-sm text-gray-500">
                    No tienes metas activas. Crea una para empezar a trackear tus objetivos.
                </Card>
            ) : (
                active.map(g => <GoalCard key={g.id} goal={g} />)
            )}

            {(completed.length > 0 || cancelled.length > 0) && (
                <details className="mt-4">
                    <summary className="text-sm text-gray-600 cursor-pointer">
                        Mostrar metas inactivas ({completed.length + cancelled.length})
                    </summary>
                    <div className="mt-3 space-y-3">
                        {completed.map(g => <GoalCard key={g.id} goal={g} />)}
                        {cancelled.map(g => <GoalCard key={g.id} goal={g} />)}
                    </div>
                </details>
            )}
        </div>
    );
}

function GoalCard({ goal }: { goal: Props["goals"][number] }) {
    const router = useRouter();
    const isActive = goal.status === "ACTIVE";
    const isCompleted = goal.status === "COMPLETED";
    const isCancelled = goal.status === "CANCELLED";

    const handleCancel = async () => {
        if (!confirm(`¿Cancelar la meta "${goal.name}"? Su historial se conservará.`)) return;
        const res = await cancelGoal(goal.id);
        if (res.success) router.refresh();
    };

    return (
        <Card className={`p-4 ${isCancelled ? "opacity-60" : ""}`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        {isCompleted && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                        {isCancelled && <XCircle className="h-5 w-5 text-gray-400" />}
                        {isActive && <Target className="h-5 w-5 text-blue-600" />}
                        <h3 className="font-semibold">{goal.name}</h3>
                    </div>
                    {goal.description && <p className="text-xs text-gray-600 mt-1">{goal.description}</p>}
                    {goal.deadline && (
                        <p className="text-xs text-gray-500 mt-1">
                            Vence: {new Date(goal.deadline).toLocaleDateString("es-MX")}
                        </p>
                    )}
                </div>
                {isActive && (
                    <div className="flex flex-wrap gap-2 shrink-0">
                        <ContributionDialog goalId={goal.id} goalName={goal.name} />
                        <Button variant="ghost" size="sm" onClick={handleCancel}>Cancelar</Button>
                    </div>
                )}
            </div>

            <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                    <span className="font-medium">${goal.currentAmount.toFixed(2)} de ${goal.targetAmount.toFixed(2)}</span>
                    <span className="text-gray-600">{goal.progressPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all ${isCompleted ? "bg-emerald-600" : isCancelled ? "bg-gray-400" : "bg-blue-600"}`}
                        style={{ width: `${goal.progressPercent}%` }}
                    />
                </div>
            </div>
        </Card>
    );
}

function GoalDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [target, setTarget] = useState("");
    const [deadline, setDeadline] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setError(null);
        const parsedTarget = Number(target);
        if (!name.trim()) { setError("Nombre requerido"); return; }
        if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) { setError("Monto objetivo inválido"); return; }

        setLoading(true);
        const res = await saveGoal({
            name: name.trim(),
            targetAmount: parsedTarget,
            deadline: deadline ? new Date(deadline) : null,
            description: description.trim() || undefined
        });
        setLoading(false);

        if (res.success) {
            setOpen(false);
            setName(""); setTarget(""); setDeadline(""); setDescription("");
            router.refresh();
        } else {
            setError(res.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> Nueva meta</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nueva meta</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <Label>Nombre</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Horno industrial" />
                    </div>
                    <div>
                        <Label>Monto objetivo</Label>
                        <Input type="number" step="0.01" min="0" value={target} onChange={e => setTarget(e.target.value)} placeholder="50000" />
                    </div>
                    <div>
                        <Label>Fecha límite (opcional)</Label>
                        <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                    </div>
                    <div>
                        <Label>Descripción (opcional)</Label>
                        <Input value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={loading}>Cancelar</Button></DialogClose>
                    <Button onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Crear meta"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ContributionDialog({ goalId, goalName }: { goalId: number; goalName: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setError(null);
        const parsed = Number(amount);
        if (!Number.isFinite(parsed) || parsed <= 0) { setError("Monto inválido"); return; }

        setLoading(true);
        const res = await addContribution(goalId, parsed, note.trim() || undefined);
        setLoading(false);

        if (res.success) {
            setOpen(false);
            setAmount(""); setNote("");
            router.refresh();
        } else {
            setError(res.message);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">Sumar contribución</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Sumar a "{goalName}"</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <Label>Monto</Label>
                        <Input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div>
                        <Label>Nota (opcional)</Label>
                        <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Ej: bono del mes" />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={loading}>Cancelar</Button></DialogClose>
                    <Button onClick={handleSave} disabled={loading}>{loading ? "Guardando..." : "Confirmar"}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}