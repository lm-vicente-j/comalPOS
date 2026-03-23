import CRMMAngaer from "./crm-manager";
import { GetAllStaffUsers } from "@/lib/actions/users";
import { getAllCustomers } from "@/lib/actions/customers";

export default async function(){


        const rawCustomers = await getAllCustomers();
        const dataCustomers = JSON.parse(JSON.stringify(rawCustomers))

        const rawUsers = await GetAllStaffUsers();
        const dataUsers = JSON.parse(JSON.stringify(rawUsers))

    return(
        <CRMMAngaer staff={dataUsers} customers={dataCustomers} />
    );
}