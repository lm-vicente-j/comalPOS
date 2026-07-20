
import Link from 'next/link';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { getActiveJornadaWithStats } from '@/lib/actions/jornada';


export default async function JornadaBanner() {
    const data = await getActiveJornadaWithStats();
    if (!data) return null;

    if (data.state === "NO_JORNADA") {
        return (
            <div className="bg-red-50 border-b border-red-200 px-4 md:px-6 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
                <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>No hay jornada activa. Las ventas y gastos están bloqueados.</span>
                </div>
                <Link href="/admin/jornada"
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-center shrink-0 whitespace-nowrap self-stretch sm:self-auto">
                    Abrir jornada
                </Link>
            </div>
        );
    }

    if (data.state === "OTHER_OPEN") {
        return (
            <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-6 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
                <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                        Jornada #{data.jornada.id} abierta por <strong>{data.jornada.openedByUser?.name}</strong> — pendiente de cerrar
                    </span>
                </div>
                <Link href="/admin/jornada"
                      className="px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-center shrink-0 whitespace-nowrap self-stretch sm:self-auto">
                    Cerrar y abrir nueva
                </Link>
            </div>
        );
    }

    // OWN_OPEN
    const { expectedCash, cashSales, bills } = data.stats;
    return (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 md:px-6 py-2 flex items-center justify-between gap-3 text-sm">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4 text-emerald-900 min-w-0">
                <span className="font-medium shrink-0">Jornada #{data.jornada.id}</span>
                <span>
                    Esperado en caja: <strong>${expectedCash.toFixed(2)}</strong>
                </span>
                <span className="text-emerald-700/70 text-xs sm:text-sm">
                    Ventas efectivo: ${cashSales.toFixed(2)} · Egresos: ${bills.toFixed(2)}
                </span>
            </div>
            <Link href="/admin/jornada"
                  className="px-3 py-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-center shrink-0 whitespace-nowrap">
                Ver detalles
            </Link>
        </div>
    );
}
