import CRMMAngaer from "./crm-manager";
import { getSuppliesData } from "@/lib/actions/inventory";

export default async function(){


        const raw = await getSuppliesData();
    
        const data = JSON.parse(JSON.stringify(raw))
    return(
        <CRMMAngaer data={data} />
    );
}