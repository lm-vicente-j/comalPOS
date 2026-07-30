
import { getTodaySalesHistory } from "@/lib/actions/sales";
import PosManager from "./pos-manager";
import MobilePosManager, { MobileJornadaInfo } from "./MobilePosManager";
import { getProductsData } from "@/lib/actions/products";
import { getAllCustomers } from "@/lib/actions/customers";
import { getActiveJornadaWithStats, hasOpenJornada } from "@/lib/actions/jornada";
import { auth } from "@/lib/auth";

export default async function Home(){

    const rawProducts = await getProductsData();
    const products = JSON.parse(JSON.stringify(rawProducts));


    const rawSales = await getTodaySalesHistory();
    const sales = JSON.parse(JSON.stringify(rawSales));

    const rawCustomerList = await getAllCustomers();
    const customerList = JSON.parse(JSON.stringify(rawCustomerList));

    const jornadaOpen = await hasOpenJornada();

    // The desktop banner hides the cash summary on phones; the mobile POS
    // surfaces it in its bottom bar instead. Same rule as the banner: only
    // ADMIN sees cash expectations, and only for their own open jornada.
    let jornadaInfo: MobileJornadaInfo | null = null;
    const session = await auth();
    if (session?.user?.role === "ADMIN") {
        const data = await getActiveJornadaWithStats();
        if (data?.state === "OWN_OPEN") {
            jornadaInfo = {
                id: data.jornada.id,
                openedBy: data.jornada.openedByUser?.name ?? null,
                openedAt: data.jornada.openedAt ? new Date(data.jornada.openedAt).toISOString() : null,
                openingAmount: data.jornada.openingAmount,
                cashSales: data.stats.cashSales,
                transferSales: data.stats.transferSales,
                bills: data.stats.bills,
                expectedCash: data.stats.expectedCash,
            };
        }
    }


    // Same split as the admin modules: the desktop POS renders from lg up,
    // the dedicated mobile POS below lg. Each owns its layout end to end.
    return(
       <>
           <div className="hidden lg:flex lg:h-full lg:w-full">
               <PosManager products={products} sales={sales} customerList={customerList} jornadaOpen={jornadaOpen}/>
           </div>

           <div className="h-full w-full lg:hidden">
               <MobilePosManager products={products} sales={sales} customerList={customerList} jornadaOpen={jornadaOpen} jornadaInfo={jornadaInfo}/>
           </div>
       </>
    );
}