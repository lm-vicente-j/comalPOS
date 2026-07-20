import CRMMAngaer from "./crm-manager";
import MobileCRMManager from "./MobileCRMManager";
import { GetAllUsers } from "@/lib/actions/users";
import { getAllCustomers } from "@/lib/actions/customers";

export default async function(){


        const rawCustomers = await getAllCustomers();
        const dataCustomers = JSON.parse(JSON.stringify(rawCustomers))

        const rawUsers = await GetAllUsers();
        const dataUsers = JSON.parse(JSON.stringify(rawUsers))

    return(
        <>
            <div className="hidden md:flex h-full w-full">
                <CRMMAngaer staff={dataUsers} customers={dataCustomers} />
            </div>

            <div className="flex md:hidden h-full w-full">
                <MobileCRMManager staff={dataUsers} customers={dataCustomers} />
            </div>
        </>
    );
}
