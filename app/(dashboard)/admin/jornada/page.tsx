import { getActiveJornadaWithStats, getJornadaEmployeeBreakdown } from "@/lib/actions/jornada";
import JornadaManager from "./jornada-manager";

export default async function JornadasPage() {
    const data = await getActiveJornadaWithStats();

    // load if there is an active jornada
    const employees = (data && data.state !== "NO_JORNADA")
        ? await getJornadaEmployeeBreakdown(data.jornada.id)
        : [];

    return (
        <div className="w-full max-w-5xl mx-auto p-6">
            <JornadaManager data={data} employees={employees} />
        </div>
    );
}