
import { getTodaySalesHistory } from "@/lib/actions/sales";
import PosManager from "./pos-manager";
import { getProductsData } from "@/lib/actions/products";
import { getAllCustomers } from "@/lib/actions/customers";
import { hasOpenJornada } from "@/lib/actions/jornada";

export default async function Home(){

    const rawProducts = await getProductsData();
    const products = JSON.parse(JSON.stringify(rawProducts));


    const rawSales = await getTodaySalesHistory();
    const sales = JSON.parse(JSON.stringify(rawSales));

    const rawCustomerList = await getAllCustomers();
    const customerList = JSON.parse(JSON.stringify(rawCustomerList));

    const jornadaOpen = await hasOpenJornada();


    return(
       <PosManager products={products} sales={sales} customerList={customerList} jornadaOpen={jornadaOpen}/>
    );
}