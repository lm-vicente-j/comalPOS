import DebtorsTable from "@/app/(dashboard)/debtors/debts-table";
import { Separator } from "@/components/ui/separator";
import { debtsColumns } from "./debts-columns";
import { getAllDebtors, getDebtsSummary } from "@/lib/actions/debts";

export default async function Home() {

    const data = JSON.parse(JSON.stringify(await getAllDebtors()));
    const summary = await getDebtsSummary();

    return (
        <div className="flex flex-col items-center justify-around z-0 w-full h-full">
            <div className="flex flex-row items-center justify-center w-full h-[30%]">
                <div className="outline rounded-md w-[95%] h-[80%] flex flex-row items-center justify-around">
                    <div className="flex flex-col items-center justify-center w-full h-full bg-white">
                        <p className="text-muted-foreground text-sm">Total por cobrar</p>
                        <p className="text-2xl font-bold text-red-600">${summary.totalAmount.toFixed(2)}</p>
                    </div>
                    <Separator orientation="vertical" />
                    <div className="flex flex-col items-center justify-center w-full h-full bg-white">
                        <p className="text-muted-foreground text-sm">Deudores activos</p>
                        <p className="text-2xl font-bold">{summary.activeDebtors}</p>
                    </div>
                    <Separator orientation="vertical" />
                    <div className="flex flex-col items-center justify-center w-full h-full bg-white">
                        <p className="text-muted-foreground text-sm">Cobros del día</p>
                        <p className="text-2xl font-bold text-green-600">${summary.todayPayments.toFixed(2)}</p>
                    </div>

                </div>
            </div>

            <div className="flex flex-row items-start justify-center w-full h-[70%]">
                <DebtorsTable columns={debtsColumns} data={data} />
            </div>
        </div>

    );
}