
import { getTodaySalesHistory } from "@/lib/actions/sales";
import PosManager from "./pos-manager";
import { getProductsData } from "@/lib/actions/products";
import { getAllCustomers } from "@/lib/actions/customers";

export default async function Home(){
    
    const rawProducts = await getProductsData();
    const products = Array.isArray(rawProducts) ? rawProducts : [];

    const serialized_products = products.map(product => ({
  ...product,
  price: product.price.toNumber(),
  name: product.name ?? "UNNAMED",
}));
    const rawSales = await getTodaySalesHistory();
    const sales = JSON.parse(JSON.stringify(rawSales));

    const rawCustomerList = await getAllCustomers();
    const customerList = JSON.parse(JSON.stringify(rawCustomerList));


    return(
       <PosManager products={serialized_products} sales={sales} customerList={customerList}/>
    );
}