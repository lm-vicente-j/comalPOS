import { getSuppliesData } from "@/lib/actions/inventory";
import { InventoryManager } from "./inventory-manager";

export default async function Home() {
    
    const raw = await getSuppliesData();

    const data = JSON.parse(JSON.stringify(raw))

    return (
        <InventoryManager data={data}/>
    );
}