import { getSuppliesData } from "@/lib/actions/inventory";
import { MenuManager } from "./menu-manager";

export default async function Home() {
    
    const raw = await getSuppliesData();

    const data = JSON.parse(JSON.stringify(raw))

    const hasSupplies = false;

    return (
        <MenuManager data={data} hasSupplies={hasSupplies}/>
    );
}