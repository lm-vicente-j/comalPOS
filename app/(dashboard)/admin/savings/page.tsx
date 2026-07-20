import { getPoolBalance, getRecentMovements, getGoalsWithProgress } from "@/lib/actions/savings";
import { hasOpenJornada } from "@/lib/actions/jornada";
import SavingsManager from "./savings-manager";

export default async function SavingsPage() {
    const [pool, movements, goals, jornadaOpen] = await Promise.all([
        getPoolBalance(),
        getRecentMovements(15),
        getGoalsWithProgress(),
        hasOpenJornada()
    ]);

    return (
        <div className="w-full max-w-5xl mx-auto p-4 md:p-6 space-y-6">
            <SavingsManager pool={pool} movements={movements} goals={goals} jornadaOpen={jornadaOpen} />
        </div>
    );
}