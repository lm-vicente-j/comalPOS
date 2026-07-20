import DebtorsTable from "@/app/(dashboard)/debtors/debts-table";
import { debtsColumns } from "./debts-columns";
import { getAllDebtors, getDebtsSummary } from "@/lib/actions/debts";

export default async function Home() {

    const data = JSON.parse(JSON.stringify(await getAllDebtors()));
    const summary = await getDebtsSummary();

    return (
        <div className="flex flex-col z-0 w-full h-full gap-4 p-4">
            <div className="grid grid-cols-3 divide-x rounded-md border bg-white shrink-0">
                <div className="flex flex-col items-center justify-center text-center px-2 py-4">
                    <p className="text-muted-foreground text-xs md:text-sm">Total por cobrar</p>
                    <p className="text-lg md:text-2xl font-bold text-red-600">${summary.totalAmount.toFixed(2)}</p>
                </div>
                <div className="flex flex-col items-center justify-center text-center px-2 py-4">
                    <p className="text-muted-foreground text-xs md:text-sm">Deudores activos</p>
                    <p className="text-lg md:text-2xl font-bold">{summary.activeDebtors}</p>
                </div>
                <div className="flex flex-col items-center justify-center text-center px-2 py-4">
                    <p className="text-muted-foreground text-xs md:text-sm">Cobros del día</p>
                    <p className="text-lg md:text-2xl font-bold text-green-600">${summary.todayPayments.toFixed(2)}</p>
                </div>
            </div>

            <div className="flex-1 min-h-0 w-full">
                <DebtorsTable columns={debtsColumns} data={data} />
            </div>
        </div>

    );
}
