"use server";

import { success, z } from "zod";
import prisma from "../prisma"
import { revalidatePath } from "next/cache";
import { Customer, CustomerSchema } from "./schemas";


export async function getAllCustomers() {

    try {
        const customers = await prisma.customer.findMany({
            orderBy: {
                customerName: 'desc'
            }
        });
        return customers;
    } catch (e) {
        console.error(e);
        return [];
    }

}

export async function saveCustomer(data: Partial<Customer>){

    const parsed = CustomerSchema.pick({ customerName: true, phone: true }).safeParse(data);

    if (!parsed.success) {
    return { 
        success: false, 
        error: "Datos inválidos",
        fieldErrors: parsed.error.flatten().fieldErrors 
    };
}

    try{
        const { id } = data;
        const { customerName, phone } = parsed.data;

        await prisma.customer.upsert({
          where: {id: id ?? -1},
          update: {customerName, phone},
          create: {
            customerName,
            phone,
            currentBalance: 0,
            registeredDate: new Date().toISOString(),
          }
        });

        revalidatePath("/admin/crm");
        return { success: true }

    }catch(e){
      return { success: false, error: "Error on save client" };
    }
}