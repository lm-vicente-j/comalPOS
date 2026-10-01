import { getStatistics } from "@/lib/actions/analytics";
import { defaultAnalyticsFilter } from "@/lib/analytics";
import StatisticsManager from "./statistics-manager";

type Props = { searchParams?: Promise<{ from?: string; to?: string }> };

export default async function StatisticsPage({ searchParams }: Props) {
    const query = await searchParams;
    const defaults = defaultAnalyticsFilter();
    const filter = { from: query?.from ?? defaults.from, to: query?.to ?? defaults.to };
    const result = await getStatistics(filter);

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-6 space-y-6">
            <StatisticsManager filter={filter} result={result} />
        </div>
    );
}
