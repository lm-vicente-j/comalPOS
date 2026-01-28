import CRMMAngaer from "./crm-manager";
import { getSuppliesData } from "@/lib/actions/inventory";

export default async function(){


        const rawCustomers = await getSuppliesData();
        const dataCustomers = JSON.parse(JSON.stringify(rawCustomers))

        const rawUsers = await getSuppliesData();
        const dataUsers = JSON.parse(JSON.stringify(rawUsers))

    return(
        <CRMMAngaer staff={dataUsers} customers={dataCustomers} />
    );
}