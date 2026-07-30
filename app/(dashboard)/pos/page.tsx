
import { getTodaySalesHistory } from "@/lib/actions/sales";
import PosManager from "./pos-manager";
import MobilePosManager from "./MobilePosManager";
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


    // Same split as the admin modules: the desktop POS renders from lg up,
    // the dedicated mobile POS below lg. Each owns its layout end to end.
    return(
       <>
           <div className="hidden lg:flex lg:h-full lg:w-full">
               <PosManager products={products} sales={sales} customerList={customerList} jornadaOpen={jornadaOpen}/>
           </div>

           <div className="h-full w-full lg:hidden">
               <MobilePosManager products={products} sales={sales} customerList={customerList} jornadaOpen={jornadaOpen}/>
           </div>
       </>
    );
}