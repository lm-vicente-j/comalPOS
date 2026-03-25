"use server";

import { success, z } from "zod";
import prisma from "../prisma"
import { revalidatePath } from "next/cache";


const CustomerSchema = z.object({
  id: z.number().int(),
  customerName: z.string().nullable(),
  phone: z.string().nullable(),
  alias: z.string().nullable(),
  lastConsumption: z.date().nullable().or(z.string()),
  currentBalance: z.number(),
  registeredDate: z.date().nullable().or(z.string()),

  debtors: z.array(
    z.object({
      id: z.number().int(),
      saleID: z.number().int().nullable(),
      amount: z.number(),
      status: z.string().nullable(),
    })
  ).optional(),

  sales: z.array(
    z.object({
      id: z.number().int(),
      total: z.number().nullable(),
      status: z.string().nullable(),
      source_type: z.string().nullable(),
      createdAt: z.date().nullable().or(z.string()),
    })
  ).optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;

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
    try{

        const {id, customerName, phone} = data;

        await prisma.customer.upsert({
          where: {id: id ?? -1},
          update: {customerName, phone},
          create: {
            customerName: customerName || "",
            phone,
            currentBalance: 0,
            registeredDate: new Date().toISOString(),
          }
        });

        revalidatePath("/admin/crm");
        return {
          success: true
        }

    }catch(e){
      return { success: false, error: "Error on save client" };
    }
}