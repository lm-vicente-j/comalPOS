import { getSuppliesData } from "@/lib/actions/inventory";
import { getProductsData } from "@/lib/actions/products"; //
import { MenuManager } from "./menu-manager";

export default async function Home() {
    
    const raw = await getSuppliesData();
    const productsRaw = await getProductsData(); 

    const data = JSON.parse(JSON.stringify(raw))
    const products = JSON.parse(JSON.stringify(productsRaw));


    return (
        <MenuManager supplies={data} products={products}/>
    );
}