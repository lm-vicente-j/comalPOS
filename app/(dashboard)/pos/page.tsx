
import { getTodaySalesHistory } from "@/lib/actions/sales";
import PosManager from "./pos-manager";
import { getProductsData } from "@/lib/actions/products";
import { getAllDebtors } from "@/lib/actions/debts";

export default async function Home(){
    
    const rawProducts = await getProductsData();
    const products = Array.isArray(rawProducts) ? rawProducts : [];

    const rawSales = await getTodaySalesHistory();
    const sales = JSON.parse(JSON.stringify(rawSales));

    const debtorsList = JSON.parse(JSON.stringify(getAllDebtors()));

    return(
       <PosManager products={products} sales={sales} debtorsList={debtorsList}/>
    );
}