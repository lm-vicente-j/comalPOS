import { getSuppliesData } from "@/lib/actions/inventory";
import { getProductsData } from "@/lib/actions/products"; //
import { MenuManager } from "./menu-manager";
import { MobileMenuManager } from "./MobileMenuManager";

export default async function Home() {

    const raw = await getSuppliesData();
    const productsRaw = await getProductsData();

    const data = JSON.parse(JSON.stringify(raw))
    const products = JSON.parse(JSON.stringify(productsRaw));


    return (
        <>
            <div className="hidden md:flex h-full w-full">
                <MenuManager supplies={data} products={products}/>
            </div>

            <div className="flex md:hidden h-full w-full">
                <MobileMenuManager supplies={data} products={products}/>
            </div>
        </>
    );
}
