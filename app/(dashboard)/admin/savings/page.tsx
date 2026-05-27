import { getPoolBalance, getRecentMovements, getGoalsWithProgress } from "@/lib/actions/savings";
import SavingsManager from "./savings-manager";

export default async function SavingsPage() {
    const [pool, movements, goals] = await Promise.all([
        getPoolBalance(),
        getRecentMovements(15),
        getGoalsWithProgress()
    ]);

    return (
        <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
            <SavingsManager pool={pool} movements={movements} goals={goals} />
        </div>
    );
}