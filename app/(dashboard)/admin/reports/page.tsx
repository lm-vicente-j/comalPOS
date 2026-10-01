import { getReport } from "@/lib/actions/analytics";
import { defaultAnalyticsFilter } from "@/lib/analytics";
import ReportsManager from "./reports-manager";

type SearchParams = Record<string, string | string[] | undefined>;

function displayValue(value: string | string[]): string {
    return Array.isArray(value) ? value.join(", ") : value;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
    const params = await searchParams;
    const defaults = defaultAnalyticsFilter();
    // Preserve present values so malformed or repeated filters reach server validation.
    const from = params.from ?? defaults.from;
    const to = params.to ?? defaults.to;
    const type = params.type ?? "sales";
    const page = params.page ?? "1";
    const result = await getReport({ from, to, type, page });
    const displayedPage = typeof page === "string" && /^[1-9]\d*$/.test(page) ? Number(page) : null;

    return (
        <div className="w-full min-w-0 max-w-6xl mx-auto p-4 md:p-6">
            <ReportsManager
                filter={{ from: displayValue(from), to: displayValue(to) }}
                type={displayValue(type)}
                page={displayedPage}
                result={result}
            />
        </div>
    );
}
