"use server";
import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { BillSchema } from "./schemas";
import z from "zod";

export async function saveExpense(data: {
  amount: number;
  category: string;
  description: string;
  date: Date;
  registered_by: number;
}) {

  const parsed = BillSchema.omit({ id: true, receiptUrl: true }).safeParse(data);

  console.log("safeParse result:", BillSchema.safeParse(data));

  if (!parsed.success) {
    return {
      success: false,
      error: "Datos inválidos",
      fieldErrors: z.flattenError(parsed.error).fieldErrors
    };
  }

  try {
    await prisma.bill.create({
      data: {
        amount: data.amount,
        category: data.category,
        description: data.description,
        date: data.date,
        registered_by: data.registered_by,
      },
    });
    revalidatePath("/expenses");
    return { success: true };
  } catch (error) {
    console.log(error)
    return { success: false, error: String(error) };
  }
}

export async function getExpenses() {
  const rows = await prisma.bill.findMany({
    orderBy: { date: 'desc' },
  });
  return rows.map((row) => BillSchema.parse(row));
}