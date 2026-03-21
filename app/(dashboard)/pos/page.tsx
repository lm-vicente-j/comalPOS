
import { getTodaySalesHistory } from "@/lib/actions/sales";
import PosManager from "./pos-manager";
import { getProductsData } from "@/lib/actions/products";
import { getAllCustomers } from "@/lib/actions/customers";

export default async function Home(){
    
    const rawProducts = await getProductsData();
    const products = JSON.parse(JSON.stringify(rawProducts));


    const rawSales = await getTodaySalesHistory();
    const sales = JSON.parse(JSON.stringify(rawSales));

    const rawCustomerList = await getAllCustomers();
    const customerList = JSON.parse(JSON.stringify(rawCustomerList));


    return(
       <PosManager products={products} sales={sales} customerList={customerList}/>
    );
}