
import { Product } from "./date-table";
import PosManager from "./pos-manager";

async function getProductsData(): Promise<Product[]>{

    // Sample data
return [
  { name: "Tacos al Pastor", price: 28.5},
  { name: "Enchiladas Verdes", price: 45.0 },
  { name: "Quesadilla de Queso", price: 22.0 },
  { name: "Pozole Rojo", price: 65.0 },
  { name: "Chilaquiles Rojos", price: 48.5 },
  { name: "Burrito de Pollo", price: 52.0 },
  { name: "Hamburguesa Clásica", price: 70.0 },
  { name: "Papas a la Francesa", price: 30.0 },
  { name: "Sopa de Tortilla", price: 38.0 },
  { name: "Agua de Jamaica", price: 15.0 },
  { name: "Refresco", price: 18.0 },
  { name: "Flan Napolitano", price: 25.0 },
];

} 

export default async function Home(){
    
    const dataProducts = await getProductsData();
    
    return(
       <PosManager products={dataProducts} />

    );
}