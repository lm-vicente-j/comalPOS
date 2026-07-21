"use client"
import { useState } from "react";
import { useRouter } from "next/navigation";
import { openJornada, closeJornada } from "@/lib/actions/jornada";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, CircleDollarSign, Users, Clock } from "lucide-react";

type Props = {
    data: Awaited<ReturnType<typeof import("@/lib/actions/jornada").getActiveJornadaWithStats>>;
    employees: Awaited<ReturnType<typeof import("@/lib/actions/jornada").getJornadaEmployeeBreakdown>>;
};

export default function JornadaManager({ data, employees }: Props) {
    if (!data || data.state === "NO_JORNADA") {
        return <OpenJornadaPanel />;
    }

    return <ActiveJornadaPanel data={data} employees={employees} />;
}

// No active jornada
function OpenJornadaPanel() {
    const router = useRouter();
    const [amount, setAmount] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleOpen = async () => {
        setError(null);
        const parsed = Number(amount);
        if (!Number.isFinite(parsed) || parsed < 0) {
            setError("Ingresa un monto válido");
            return;
        }

        setLoading(true);
        const res = await openJornada(parsed);
        setLoading(false);

        if (res.success) {
            router.refresh();
        } else {
            setError(res.error ?? "Error desconocido");
        }
    };

    return (
        <Card className="p-6 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-4">
                <Clock className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold">Iniciar jornada</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
                No hay jornada activa. Cuenta el efectivo que hay en la caja ahora y regístralo como monto inicial.
            </p>
            <div className="space-y-3">
                <div>
                    <Label htmlFor="opening">Monto inicial en caja</Label>
                    <Input
                        id="opening"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button onClick={handleOpen} disabled={loading} className="w-full">
                    {loading ? "Abriendo..." : "Abrir jornada"}
                </Button>
            </div>
        </Card>
    );
}

// active jornada
function ActiveJornadaPanel({ data, employees }: { data: any; employees: any[] }) {
    const isOwn = data.state === "OWN_OPEN";
    const { jornada, stats } = data;

    return (
        <div className="space-y-4">
            {!isOwn && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-900">
                        <strong>Esta jornada la abrió otra persona.</strong> Para abrir una nueva, primero cuenta el efectivo de la caja y cierra esta. La responsabilidad de cualquier diferencia se le asigna a <strong>{jornada.openedByUser?.name}</strong> (quien la abrió).
                    </div>
                </div>
            )}

            {/* Header de la jornada */}
            <Card className="p-6">
                {/* flex-wrap: on very narrow screens the close button drops
                    below the title instead of colliding with it */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                    <div className="min-w-0">
                        <h2 className="text-xl font-semibold">Jornada #{jornada.id}</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Abierta por <strong>{jornada.openedByUser?.name}</strong> · {new Date(jornada.openedAt).toLocaleString("es-MX")}
                        </p>
                    </div>
                    <CloseJornadaDialog jornadaId={jornada.id} expectedCash={stats.expectedCash} forced={!isOwn} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Monto inicial" value={Number(jornada.openingAmount)} />
                    <Stat label="Ventas efectivo" value={stats.cashSales} positive />
                    <Stat label="Egresos" value={stats.bills} negative />
                    <Stat label="Esperado en caja" value={stats.expectedCash} highlight />
                </div>

                {stats.transferSales > 0 && (
                    <p className="text-xs text-gray-500 mt-3">
                        + ${stats.transferSales.toFixed(2)} en transferencias (no afectan al efectivo)
                    </p>
                )}
            </Card>

            {/* Ventas por empleado */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-gray-700" />
                    <h3 className="font-semibold">Ventas por empleado</h3>
                </div>
                {employees.length === 0 ? (
                    <p className="text-sm text-gray-500">Aún no hay ventas registradas en esta jornada.</p>
                ) : (
                    <div className="divide-y">
                        {employees.map(emp => (
                            <div key={emp.userId} className="py-3 flex items-center justify-between">
                                <span className="font-medium">{emp.userName}</span>
                                <div className="flex items-center gap-6 text-sm">
                                    <span className="text-gray-600">{emp.salesCount} venta{emp.salesCount !== 1 ? "s" : ""}</span>
                                    <span className="font-semibold w-24 text-right">${emp.totalSold.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}

// stats
function Stat({ label, value, positive, negative, highlight }: {
    label: string;
    value: number;
    positive?: boolean;
    negative?: boolean;
    highlight?: boolean;
}) {
    const valueColor = highlight ? "text-emerald-700 text-xl font-bold"
        : positive ? "text-emerald-600 font-semibold"
            : negative ? "text-red-600 font-semibold"
                : "text-gray-900 font-semibold";

    return (
        <div className={`rounded-lg p-3 ${highlight ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50"}`}>
            <p className="text-xs text-gray-600 uppercase tracking-wide">{label}</p>
            <p className={`mt-1 ${valueColor}`}>
                {negative && "−"}${value.toFixed(2)}
            </p>
        </div>
    );
}

// "MESA_4" -> "Mesa 4", "CL- Juan" -> "Cliente Juan"
function formatSourceType(source: string): string {
    if (source.startsWith("MESA_")) return `Mesa ${source.slice(5)}`;
    if (source.startsWith("CL- ")) return `Cliente ${source.slice(4)}`;
    return source;
}

type OpenAccount = { sourceType: string; count: number; total: number };

// physical count dialog
function CloseJornadaDialog({ jornadaId, expectedCash, forced }: {
    jornadaId: number;
    expectedCash: number;
    forced: boolean;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [actual, setActual] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [openAccounts, setOpenAccounts] = useState<OpenAccount[]>([]);
    const [loading, setLoading] = useState(false);

    const handleClose = async () => {
        setError(null);
        setOpenAccounts([]);
        const parsed = Number(actual);
        if (!Number.isFinite(parsed) || parsed < 0) {
            setError("Ingresa un monto válido");
            return;
        }

        setLoading(true);
        const res = await closeJornada(jornadaId, parsed);
        setLoading(false);

        if (res.success) {
            setOpen(false);
            router.refresh();
        } else if (res.error === "OPEN_ACCOUNTS" && "openAccounts" in res) {
            setOpenAccounts(res.openAccounts ?? []);
        } else {
            setError(res.error ?? "Error desconocido");
        }
    };

    const diff = Number(actual) - expectedCash;
    const hasDiff = actual !== "" && Number.isFinite(Number(actual));

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant={forced ? "default" : "outline"}>
                    {forced ? "Cerrar y abrir nueva" : "Cerrar jornada"}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Cerrar jornada — conteo físico</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>Cuenta el efectivo que hay físicamente en la caja en este momento e ingresa el total.</p>
                            <p className="text-sm">
                                Esperado según el sistema: <strong>${expectedCash.toFixed(2)}</strong>
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3 my-3">
                    <Label htmlFor="actual">Efectivo contado</Label>
                    <Input
                        id="actual"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="0.00"
                        value={actual}
                        onChange={(e) => setActual(e.target.value)}
                    />
                    {hasDiff && (
                        <div className={`text-sm p-2 rounded ${diff === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
                            {diff === 0
                                ? "✓ La caja cuadra exactamente."
                                : `Diferencia: ${diff > 0 ? "+" : ""}$${diff.toFixed(2)} ${diff < 0 ? "(faltante)" : "(sobrante)"}`
                            }
                        </div>
                    )}
                    {error && <p className="text-sm text-red-600">{error}</p>}

                    {openAccounts.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                <p className="text-sm font-semibold text-red-800">
                                    No se puede cerrar: hay cuentas abiertas sin cobrar.
                                </p>
                            </div>
                            <ul className="text-sm text-red-800 divide-y divide-red-200">
                                {openAccounts.map((acc) => (
                                    <li key={acc.sourceType} className="py-1.5 flex items-center justify-between gap-2">
                                        <span className="font-medium">{formatSourceType(acc.sourceType)}</span>
                                        <span className="text-xs">
                                            {acc.count} pedido{acc.count !== 1 ? "s" : ""} · ${acc.total.toFixed(2)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-red-700">
                                Resuelve cada cuenta en el POS (cerrar cuenta, enviar a deuda o cancelar) antes de intentar cerrar la jornada.
                            </p>
                        </div>
                    )}
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    {/* preventDefault keeps the dialog open so validation errors
                        and the open-accounts list are actually visible; it only
                        closes itself on success (handleClose -> setOpen(false)). */}
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleClose();
                        }}
                        disabled={loading}
                    >
                        {loading ? "Cerrando..." : "Confirmar cierre"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}