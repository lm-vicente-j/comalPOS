import CRMMAngaer from "./crm-manager";
import { GetAllUsers } from "@/lib/actions/users";
import { getAllCustomers } from "@/lib/actions/customers";

export default async function(){


        const rawCustomers = await getAllCustomers();
        const dataCustomers = JSON.parse(JSON.stringify(rawCustomers))

        const rawUsers = await GetAllUsers();
        const dataUsers = JSON.parse(JSON.stringify(rawUsers))

    return(
        <CRMMAngaer staff={dataUsers} customers={dataCustomers} />
    );
}