import { getSuppliesData } from "@/lib/actions/inventory";
import { InventoryManager } from "./inventory-manager";
import { MobileInventoryManager } from "./MobileInventoryManager";

export default async function Home() {

    const raw = await getSuppliesData();

    const data = JSON.parse(JSON.stringify(raw))

    return (
        <>
            <div className="hidden md:flex h-full w-full">
                <InventoryManager data={data} />
            </div>

            <div className="flex md:hidden h-full w-full">
                <MobileInventoryManager data={data} />
            </div>
        </>
    );
}